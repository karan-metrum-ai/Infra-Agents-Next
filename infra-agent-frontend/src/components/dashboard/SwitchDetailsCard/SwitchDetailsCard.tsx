"use client";

/**
 * SwitchDetailsCard
 *
 * Displays SONiC network switch details when a switch device is clicked in
 * the 3D rack visualization. Sections cover system info, port status, CPU /
 * memory, BGP sessions, environmental health (fans/PSUs), active alarms,
 * recent events, and LLDP neighbors.
 *
 * Stateless — all data comes from `useGetLiveSwitchDetailQuery`, polled
 * every 30s.
 */

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  X,
  Network,
  Cpu,
  Thermometer,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Info,
  Radio,
  Fan,
  ArrowUpDown,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge/Badge";
import type { BadgeVariant } from "@/components/ui/Badge/Badge.types";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { useGetLiveSwitchDetailQuery } from "@/features/digitalTwin/digitalTwinApi";
import type {
  SwitchAlarm,
  SwitchBgpSession,
  SwitchEvent,
  SwitchFan,
  SwitchLldpNeighbor,
  SwitchPortInfo,
  SwitchPsu,
} from "@/features/digitalTwin/digitalTwinApi.types";
import styles from "./SwitchDetailsCard.module.css";
import type { SwitchDetailsCardProps } from "./SwitchDetailsCard.types";

function healthVariant(status: string): BadgeVariant {
  switch (status) {
    case "healthy":
      return "success";
    case "warning":
      return "warning";
    case "critical":
      return "destructive";
    default:
      return "outline";
  }
}

function HealthBadge({ status }: { status: string }) {
  return (
    <Badge variant={healthVariant(status)} className={styles.healthBadge}>
      <span className={styles.healthDot} aria-hidden="true" />
      {status}
    </Badge>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Icon size={14} aria-hidden="true" />
        <span>{title}</span>
      </div>
      <div className={styles.sectionContent}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}

function PortGrid({ ports }: { ports: SwitchPortInfo[] }) {
  if (!ports.length) return <span className={styles.emptyText}>No data</span>;
  return (
    <div className={styles.portGrid}>
      {ports.map((p) => (
        <div
          key={p.ifname}
          data-up={p.oper_status === 1}
          className={styles.portDot}
          title={`${p.ifname} (${p.alias}) ${p.speed} — ${p.oper_status === 1 ? "UP" : "DOWN"}${p.reason ? ` (${p.reason})` : ""}`}
        />
      ))}
    </div>
  );
}

function BgpTable({ sessions }: { sessions: SwitchBgpSession[] }) {
  if (!sessions.length) {
    return <span className={styles.emptyText}>No BGP sessions</span>;
  }
  return (
    <div className={styles.bgpTable}>
      {sessions.map((s) => (
        <div key={s.neighbor_address} className={styles.bgpRow}>
          <span className={styles.bgpNeighbor}>{s.neighbor_address}</span>
          <span className={styles.bgpAs}>AS{s.peer_as}</span>
          <span className={styles.bgpStatus} data-established={s.established}>
            {s.established ? "ESTABLISHED" : "DOWN"}
          </span>
        </div>
      ))}
    </div>
  );
}

function EnvGrid({ fans, psus }: { fans: SwitchFan[]; psus: SwitchPsu[] }) {
  return (
    <div className={styles.envGrid}>
      <div className={styles.envColumn}>
        <div className={styles.envColumnLabel}>FANS</div>
        <div className={styles.envItems}>
          {fans.map((f) => (
            <div
              key={f.fan_name}
              title={f.fan_name}
              data-active={f.active}
              className={styles.envBox}
            >
              <Fan size={10} aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
      <div className={styles.envColumn}>
        <div className={styles.envColumnLabel}>PSUs</div>
        <div className={styles.envItems}>
          {psus.map((p) => (
            <div
              key={p.psu_name}
              title={p.psu_name}
              data-active={p.active}
              className={styles.envBox}
            >
              <Zap size={10} aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlarmsList({ alarms }: { alarms: SwitchAlarm[] }) {
  if (!alarms.length) {
    return (
      <div className={styles.alarmsEmpty}>
        <CheckCircle2 size={12} aria-hidden="true" /> No active alarms
      </div>
    );
  }
  return (
    <div className={styles.alarmsList}>
      {alarms.map((a, i) => (
        <div key={`${a.alarm_id}-${i}`} className={styles.alarmRow}>
          <AlertTriangle
            size={12}
            aria-hidden="true"
            data-critical={a.severity.toLowerCase().includes("critical")}
            className={styles.alarmIcon}
          />
          <span className={styles.alarmText}>{a.text || a.type_id}</span>
        </div>
      ))}
    </div>
  );
}

function EventsList({ events }: { events: SwitchEvent[] }) {
  if (!events.length) {
    return <span className={styles.emptyText}>No recent events</span>;
  }
  return (
    <div className={styles.eventsList}>
      {events.slice(0, 10).map((e, i) => (
        <div key={`${e.event_id}-${i}`} className={styles.eventRow}>
          <span className={styles.eventAction} data-raise={e.action === "RAISE"}>
            {e.action}
          </span>
          <span className={styles.eventText}>{e.text || e.type_id}</span>
        </div>
      ))}
    </div>
  );
}

function LldpTable({ neighbors }: { neighbors: SwitchLldpNeighbor[] }) {
  if (!neighbors.length) {
    return <span className={styles.emptyText}>No LLDP neighbors</span>;
  }
  return (
    <div className={styles.lldpTable}>
      {neighbors.map((n, i) => (
        <div key={`${n.local_port}-${i}`} className={styles.lldpRow}>
          <span className={styles.lldpLocal}>{n.local_port}</span>
          <span className={styles.lldpRemote}>
            {n.neighbor_name}:{n.neighbor_port}
          </span>
        </div>
      ))}
    </div>
  );
}

/** SONiC switch inspector card — shown when a switch device is selected in the rack view. */
export function SwitchDetailsCard({
  deviceId,
  deviceName,
  onClose,
  variant = "default",
}: SwitchDetailsCardProps) {
  const { data, isLoading, error } = useGetLiveSwitchDetailQuery(deviceId, {
    pollingInterval: 30000,
  });

  const cardClass = variant === "right" ? styles.cardRight : styles.card;

  return (
    <div className={cardClass}>
      <div className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <Network size={16} aria-hidden="true" className={styles.headerIcon} />
          <div className={styles.headerText}>
            <div className={styles.deviceName}>{deviceName}</div>
            <div className={styles.deviceSubtitle}>SONiC Switch</div>
          </div>
        </div>
        {data && <HealthBadge status={data.health_status} />}
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close switch details"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.content}>
        {isLoading && (
          <div className={styles.loadingState}>
            <Spinner size="sm" aria-hidden="true" />
            Loading switch data…
          </div>
        )}

        {error && !isLoading && <div className={styles.errorState}>Failed to load switch data</div>}

        {data && (
          <>
            <Section icon={Info} title="System Info">
              <InfoRow label="Hostname" value={data.system.hostname} />
              <InfoRow label="Model" value={data.system.model || data.system.hwsku} />
              <InfoRow label="SONiC Version" value={data.system.sw_version} />
              <InfoRow label="Serial" value={data.system.serial} />
              <InfoRow label="MAC" value={data.system.mac} />
              <InfoRow label="Mgmt IP" value={data.system.management_ip} />
              <InfoRow
                label="Location"
                value={
                  data.system.site && data.system.rack
                    ? `${data.system.site} / ${data.system.rack}`
                    : data.system.site
                }
              />
            </Section>

            <Section
              icon={Network}
              title={`Ports — ${data.ports.up ?? 0}/${data.ports.total ?? 0} Up`}
            >
              <PortGrid ports={data.ports.interfaces ?? []} />
            </Section>

            <Section icon={Cpu} title="Resources">
              {data.cpu && (
                <InfoRow label="CPU" value={`${(100 - (data.cpu.idle ?? 0)).toFixed(1)}% used`} />
              )}
              {data.memory.usage_percent != null && (
                <InfoRow label="Memory" value={`${data.memory.usage_percent}% used`} />
              )}
              {data.process_count != null && (
                <InfoRow label="Processes" value={data.process_count} />
              )}
            </Section>

            <Section icon={ArrowUpDown} title="BGP Sessions">
              <BgpTable sessions={data.bgp_sessions ?? []} />
            </Section>

            <Section icon={Thermometer} title="Environmental">
              <EnvGrid fans={data.fans ?? []} psus={data.psus ?? []} />
            </Section>

            <Section icon={AlertTriangle} title="Active Alarms">
              <AlarmsList alarms={data.alarms ?? []} />
            </Section>

            <Section icon={Clock} title="Recent Events">
              <EventsList events={data.events ?? []} />
            </Section>

            <Section icon={Radio} title="LLDP Neighbors">
              <LldpTable neighbors={data.lldp_neighbors ?? []} />
            </Section>

            <div className={styles.freshnessFooter}>Data: {data.data_freshness}</div>
          </>
        )}
      </div>
    </div>
  );
}
