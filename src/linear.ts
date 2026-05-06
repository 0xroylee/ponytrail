import { normalizeIssueKey } from "./state";
import type {
	LinearIssue,
	ResolvedProjectConfig,
	WorkflowStage,
} from "./types";

interface GraphQLResult<T> {
	data?: T;
	errors?: Array<{ message: string }>;
}

interface RawWorkflowState {
	id: string;
	name: string;
	team?: {
		id: string;
	};
}

interface RawIssueLabel {
	id: string;
	name: string;
	team?: {
		id: string;
	};
}

interface RawLinearIssue {
	id: string;
	identifier: string;
	title: string;
	url: string;
	state: {
		id: string;
		name: string;
	};
	labels?: {
		nodes: Array<{
			id: string;
			name: string;
		}>;
	};
}

type WorkflowLabelStage = keyof ResolvedProjectConfig["linear"]["labelMap"];

export class LinearClient {
	constructor(private readonly config: ResolvedProjectConfig) {}
	private resolvedStatusMap:
		| ResolvedProjectConfig["linear"]["statusMap"]
		| null = null;
	private resolvedWorkflowLabelIds: Partial<
		Record<WorkflowLabelStage, string>
	> = {};
	private workflowLabelIds: string[] = [];
	private workflowLabelsResolved = false;

	async fetchWork(issueArg?: string): Promise<LinearIssue[]> {
		await this.ensureResolvedStatusMap();

		if (issueArg) {
			const issue = await this.findIssueByIdentifier(
				normalizeIssueKey(issueArg),
			);
			return issue ? [issue] : [];
		}

		const data = await this.graphql<{
			viewer: {
				assignedIssues: {
					nodes: RawLinearIssue[];
				};
			};
		}>(
			`
      query AssignedIssues($first: Int!) {
        viewer {
          assignedIssues(first: $first) {
            nodes {
              id
              identifier
              title
              url
              state { id name }
              labels { nodes { id name } }
            }
          }
        }
      }
      `,
			{ first: this.config.linear.pollLimit },
		);

		const raw = data.viewer.assignedIssues.nodes;
		return raw
			.map(mapRawIssue)
			.filter((issue) => issue.state.id === this.requiredStatusMap().assigned)
			.filter((issue) => {
				if (!this.config.linear.requiredLabel) {
					return true;
				}
				return issue.labels.some(
					(label) =>
						label.name.toLowerCase() ===
						this.config.linear.requiredLabel?.toLowerCase(),
				);
			});
	}

	async markStage(
		issueId: string,
		stage: keyof ResolvedProjectConfig["linear"]["statusMap"],
	): Promise<void> {
		await this.ensureResolvedStatusMap();
		if (this.config.dryRun) {
			return;
		}
		const stateId = this.requiredStatusMap()[stage];
		await this.graphql(
			`
      mutation UpdateIssueState($id: String!, $stateId: String!) {
        issueUpdate(id: $id, input: { stateId: $stateId }) {
          success
        }
      }
      `,
			{ id: issueId, stateId },
		);
	}

	async applyStageLabel(issueId: string, stage: WorkflowStage): Promise<void> {
		if (!isWorkflowLabelStage(stage)) {
			return;
		}
		await this.ensureResolvedWorkflowLabels();
		const nextLabelId = this.resolvedWorkflowLabelIds[stage];
		if (!nextLabelId || this.config.dryRun) {
			return;
		}

		const removedLabelIds = this.workflowLabelIds.filter(
			(labelId) => labelId !== nextLabelId,
		);
		await this.graphql(
			`
      mutation UpdateIssueLabels($id: String!, $addedLabelIds: [String!], $removedLabelIds: [String!]) {
        issueUpdate(id: $id, input: { addedLabelIds: $addedLabelIds, removedLabelIds: $removedLabelIds }) {
          success
        }
      }
      `,
			{
				id: issueId,
				addedLabelIds: [nextLabelId],
				removedLabelIds,
			},
		);
	}

	async comment(issueId: string, body: string): Promise<void> {
		if (this.config.dryRun) {
			return;
		}
		await this.graphql(
			`
      mutation AddComment($issueId: String!, $body: String!) {
        commentCreate(input: { issueId: $issueId, body: $body }) {
          success
        }
      }
      `,
			{ issueId, body },
		);
	}

	private async findIssueByIdentifier(
		identifier: string,
	): Promise<LinearIssue | null> {
		const data = await this.graphql<{
			issues: {
				nodes: RawLinearIssue[];
			};
		}>(
			`
      query IssueByIdentifier($identifier: String!) {
        issues(first: 1, filter: { identifier: { eq: $identifier } }) {
          nodes {
            id
            identifier
            title
            url
            state { id name }
            labels { nodes { id name } }
          }
        }
      }
      `,
			{ identifier },
		);
		const issue = data.issues.nodes[0];
		if (!issue) {
			return null;
		}
		return mapRawIssue(issue);
	}

	private async graphql<TData>(
		query: string,
		variables: Record<string, unknown>,
	): Promise<TData> {
		const response = await fetch(this.config.linear.apiUrl, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: this.config.linear.apiKey,
			},
			body: JSON.stringify({ query, variables }),
		});

		if (!response.ok) {
			throw new Error(
				`Linear API request failed: ${response.status} ${response.statusText}`,
			);
		}

		const payload = (await response.json()) as GraphQLResult<TData>;
		if (payload.errors?.length) {
			throw new Error(
				`Linear GraphQL error: ${payload.errors.map((e) => e.message).join("; ")}`,
			);
		}
		if (!payload.data) {
			throw new Error("Linear GraphQL response did not include data");
		}
		return payload.data;
	}

	private async ensureResolvedStatusMap(): Promise<void> {
		if (this.resolvedStatusMap) {
			return;
		}

		const statesData = await this.graphql<{
			workflowStates: {
				nodes: RawWorkflowState[];
			};
		}>(
			`
      query WorkflowStates($first: Int!) {
        workflowStates(first: $first) {
          nodes {
            id
            name
            team { id }
          }
        }
      }
      `,
			{ first: 250 },
		);

		const states = statesData.workflowStates.nodes.filter((state) =>
			this.config.linear.teamId
				? state.team?.id === this.config.linear.teamId
				: true,
		);

		const statusMap = this.config.linear.statusMap;
		this.resolvedStatusMap = {
			assigned: this.resolveStatusValue("assigned", statusMap.assigned, states),
			planning: this.resolveStatusValue("planning", statusMap.planning, states),
			implementing: this.resolveStatusValue(
				"implementing",
				statusMap.implementing,
				states,
			),
			pr_created: this.resolveStatusValue(
				"pr_created",
				statusMap.pr_created,
				states,
			),
			reviewing: this.resolveStatusValue(
				"reviewing",
				statusMap.reviewing,
				states,
			),
			testing: this.resolveStatusValue("testing", statusMap.testing, states),
			blocked: this.resolveStatusValue("blocked", statusMap.blocked, states),
			done: this.resolveStatusValue("done", statusMap.done, states),
		};
	}

	private async ensureResolvedWorkflowLabels(): Promise<void> {
		if (this.workflowLabelsResolved) {
			return;
		}

		const configuredEntries = Object.entries(
			this.config.linear.labelMap,
		).filter(([, labelName]) => Boolean(labelName?.trim())) as Array<
			[WorkflowLabelStage, string]
		>;

		if (configuredEntries.length === 0) {
			this.resolvedWorkflowLabelIds = {};
			this.workflowLabelIds = [];
			this.workflowLabelsResolved = true;
			return;
		}

		const labelsData = await this.graphql<{
			issueLabels: {
				nodes: RawIssueLabel[];
			};
		}>(
			`
      query IssueLabels($first: Int!) {
        issueLabels(first: $first) {
          nodes {
            id
            name
            team { id }
          }
        }
      }
      `,
			{ first: 250 },
		);

		const availableLabels = [...labelsData.issueLabels.nodes];
		const resolved: Partial<Record<WorkflowLabelStage, string>> = {};

		for (const [stage, labelNameRaw] of configuredEntries) {
			const labelName = labelNameRaw.trim();
			let labelId = this.findLabelIdByName(labelName, availableLabels);
			if (!labelId) {
				if (!this.config.linear.autoCreateLabels) {
					throw new Error(
						`Linear label '${labelName}' for stage '${stage}' was not found in project '${this.config.id}'.`,
					);
				}
				const created = await this.createIssueLabel(labelName);
				labelId = created.id;
				availableLabels.push(created);
			}
			resolved[stage] = labelId;
		}

		this.resolvedWorkflowLabelIds = resolved;
		this.workflowLabelIds = Array.from(
			new Set(
				Object.values(resolved).filter(
					(labelId): labelId is string => typeof labelId === "string",
				),
			),
		);
		this.workflowLabelsResolved = true;
	}

	private findLabelIdByName(
		labelName: string,
		labels: RawIssueLabel[],
	): string | undefined {
		const matches = labels.filter(
			(label) => label.name.toLowerCase() === labelName.toLowerCase(),
		);
		if (matches.length === 0) {
			return undefined;
		}
		if (this.config.linear.teamId) {
			const teamMatch = matches.find(
				(label) => label.team?.id === this.config.linear.teamId,
			);
			if (teamMatch) {
				return teamMatch.id;
			}
			const workspaceLabel = matches.find((label) => !label.team?.id);
			if (workspaceLabel) {
				return workspaceLabel.id;
			}
		}
		return matches[0]?.id;
	}

	private async createIssueLabel(labelName: string): Promise<RawIssueLabel> {
		const data = await this.graphql<{
			issueLabelCreate: {
				success: boolean;
				issueLabel: RawIssueLabel;
			};
		}>(
			`
      mutation CreateIssueLabel($input: IssueLabelCreateInput!) {
        issueLabelCreate(input: $input) {
          success
          issueLabel {
            id
            name
            team { id }
          }
        }
      }
      `,
			{
				input: {
					name: labelName,
					teamId: this.config.linear.teamId,
				},
			},
		);

		if (!data.issueLabelCreate.success) {
			throw new Error(`Failed to create Linear label '${labelName}'.`);
		}
		return data.issueLabelCreate.issueLabel;
	}

	private resolveStatusValue(
		key: keyof ResolvedProjectConfig["linear"]["statusMap"],
		value: string,
		states: RawWorkflowState[],
	): string {
		const trimmed = value.trim();
		if (isLikelyUuid(trimmed)) {
			return trimmed;
		}
		const found = states.find(
			(state) => state.name.toLowerCase() === trimmed.toLowerCase(),
		);
		if (!found) {
			throw new Error(
				`Unable to resolve Linear status '${trimmed}' for '${key}' in project '${this.config.id}'.`,
			);
		}
		return found.id;
	}

	private requiredStatusMap(): ResolvedProjectConfig["linear"]["statusMap"] {
		if (!this.resolvedStatusMap) {
			throw new Error("Linear status map is not resolved");
		}
		return this.resolvedStatusMap;
	}
}

function mapRawIssue(issue: RawLinearIssue): LinearIssue {
	return {
		id: issue.id,
		identifier: issue.identifier,
		title: issue.title,
		url: issue.url,
		state: issue.state,
		labels: issue.labels?.nodes ?? [],
	};
}

function isLikelyUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		value,
	);
}

function isWorkflowLabelStage(
	stage: WorkflowStage,
): stage is WorkflowLabelStage {
	return stage === "pr_created" || stage === "reviewing" || stage === "testing";
}
