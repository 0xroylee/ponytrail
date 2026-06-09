"use client";

import { useEffect, useState } from "react";
import { resolveMinimumLoadingShellState } from "./chat-room-loading-state";

export function useMinimumChatRoomLoadingShell(
	isLoading: boolean,
	scopeKey: string | null,
): boolean {
	const [loadingShellState, setLoadingShellState] = useState(() => {
		const initialState = resolveMinimumLoadingShellState({
			isLoading,
			now: Date.now(),
			visible: false,
			visibleSince: null,
		});
		return {
			scopeKey,
			visible: initialState.visible,
			visibleSince: initialState.visibleSince,
		};
	});
	const activeScopeKey = loadingShellState.scopeKey;
	const isVisible = loadingShellState.visible;
	const visibleSince = loadingShellState.visibleSince;

	useEffect(() => {
		const currentState =
			activeScopeKey === scopeKey
				? { scopeKey: activeScopeKey, visible: isVisible, visibleSince }
				: { scopeKey, visible: false, visibleSince: null };
		const nextState = resolveMinimumLoadingShellState({
			isLoading,
			now: Date.now(),
			visible: currentState.visible,
			visibleSince: currentState.visibleSince,
		});
		const nextViewState = {
			scopeKey,
			visible: nextState.visible,
			visibleSince: nextState.visibleSince,
		};
		const activeViewState = {
			scopeKey: activeScopeKey,
			visible: isVisible,
			visibleSince,
		};
		if (!isSameLoadingShellState(activeViewState, nextViewState)) {
			setLoadingShellState(nextViewState);
		}
		if (!nextState.visible || nextState.remainingMs === 0 || isLoading) return;
		const timer = window.setTimeout(() => {
			setLoadingShellState((current) => {
				if (current.scopeKey !== scopeKey) return current;
				const settledState = resolveMinimumLoadingShellState({
					isLoading: false,
					now: Date.now(),
					visible: current.visible,
					visibleSince: current.visibleSince,
				});
				const settledViewState = {
					scopeKey,
					visible: settledState.visible,
					visibleSince: settledState.visibleSince,
				};
				return isSameLoadingShellState(current, settledViewState)
					? current
					: settledViewState;
			});
		}, nextState.remainingMs);
		return () => window.clearTimeout(timer);
	}, [activeScopeKey, isLoading, isVisible, scopeKey, visibleSince]);

	return activeScopeKey === scopeKey && isVisible;
}

function isSameLoadingShellState(
	left: {
		scopeKey: string | null;
		visible: boolean;
		visibleSince: number | null;
	},
	right: {
		scopeKey: string | null;
		visible: boolean;
		visibleSince: number | null;
	},
): boolean {
	return (
		left.scopeKey === right.scopeKey &&
		left.visible === right.visible &&
		left.visibleSince === right.visibleSince
	);
}
