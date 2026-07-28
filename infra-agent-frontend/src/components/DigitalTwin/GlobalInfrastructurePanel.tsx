/**
 * Top-left logo/nav pill shown across all `DataCenterDigitalTwin` view
 * modes (unless `hideNavigation` is set).
 */

import Image from "next/image";
import { Separator } from "@/components/ui/Separator/Separator";
import { CenterNavPanel } from "@/components/CenterNavPanel/CenterNavPanel";
import headerStyles from "./DigitalTwinHeader.module.css";

export function GlobalInfrastructurePanel() {
  return (
    <div className={headerStyles.topBar}>
      <div className={headerStyles.logoPanel}>
        <CenterNavPanel />
        <Image
          src="/metrum-logo-white.webp"
          alt="Metrum AI"
          className={headerStyles.logo}
          width={140}
          height={40}
          priority
        />
        <Image
          src="/android-chrome-512x512.png"
          alt="Metrum AI"
          className={headerStyles.logoIcon}
          width={28}
          height={28}
        />
        <Separator orientation="vertical" className={headerStyles.separatorSm} />
        <h1 className={headerStyles.title}>Global Infrastructure</h1>
      </div>
    </div>
  );
}
