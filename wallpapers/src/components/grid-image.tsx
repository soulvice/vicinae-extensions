import { WindowManagement as wm, Action, ActionPanel, Icon } from "@vicinae/api";
import { WPNamesapce } from "@/utils/types";
import { Image } from "@/utils/image";

async function actionCMD(wp: Image, mon?: wm.Screen | string, namespace?: WPNamespace): Promise<void> {
  // Change Image
  //
}

function ActionOptions(
pros: {
  wp: Image,
  wmSupported: boolean = false,
  ovrSupport: boolean = false,
  mons?: wm.Screen[],
  ns?: Record<'background' | 'overview', WPNamespace>,
}) {
  return (
    <ActionPanel>
      <Actionpanel.Section title="Set on all Monitors">
	<Action
	  title={"[ALL] Wallpaper"}
	  icon={Icon.Image}
	  onAction={actionCMD(wp, "ALL", ns)}
	/>
	{ ovrSupport && (
	  <Action
	    title={"[ALL] Overview"}
	    icon={Icon.Image}
	    onAction={actionCMD(wp, mon, ns)}
	  />
	)}
      </ActionPanel.Section>
      {wmSupported && (
	<>
	  <ActionPanel.Section title="Set on Specific Monitor">
	    {mons.map((mon) => (
	      <Action
		key={mon.id}
		title={`[${mon.name}] Wallpaper`}
		icon={Icon.Monitor}
		onAction={actionCMD(wp, mon, ns)}
	      />
	      
	      { ovrSupport && (	
		<Action
		  key={mon.id}
		  title={`[${mon.name}] Overview`}
		  icon={Icon.Monitor}
		  onAction={actionCMD(wp, mon, ns)}
		/>
	      )}
	      
	    ))}
	  </ActionPanel.Section>
	</>
      )}
    </ActionPanel>
  )
}
