import type {
	SettingsModelConfigKey,
	SettingsModelStageId,
} from "../../settings/types/settings-models.types";

export interface DefaultAgentDefinition {
	id: SettingsModelStageId;
	label: string;
	configKey: SettingsModelConfigKey;
	description: string;
	instructions: string;
}
