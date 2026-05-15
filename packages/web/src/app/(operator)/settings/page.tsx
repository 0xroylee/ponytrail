import type { ReactElement } from "react";

import { OperatorSectionPanel } from "@/components/web-shell/operator-section-panel";

export default function SettingsPage(): ReactElement {
	return <OperatorSectionPanel sectionKey="settings" />;
}
