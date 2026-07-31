"use client";

import { useMemo, useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { HelpCircle, Search } from "lucide-react";
import { Kbd } from "@/components/ui/Kbd/Kbd";
import { useMountEffect } from "@/hooks/useMountEffect";
import {
  getFrequentCommandIds,
  recordCommandUsage,
  useCommandRegistry,
  type CommandItem as RegisteredCommand,
} from "@/hooks/useCommandRegistry";
import { GROUP_ORDER } from "./CommandPalette.types";
import styles from "./CommandPalette.module.css";

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Global Cmd+K command palette (`.cursor/rules/frontend/006-cmdk.mdc`),
 * mounted once in the root layout. Built on `cmdk` (no custom
 * implementation) reading exclusively from `useCommandRegistry` -- this
 * component never defines an action itself.
 *
 * Two views: the default search list (with a "Frequently used" group when
 * the query is empty, per the rule's frequency-tracking requirement) and
 * a help screen (`Cmd+/`) listing every command grouped with its
 * shortcut. `cmdk` owns all keyboard navigation/focus/screen-reader
 * behavior internally -- not overridden here, per the rule.
 *
 * Sans-effect: the one genuine external-system subscription (a
 * `window` keydown listener for the `⌘K`/`⌘/` shortcuts) lives behind
 * `useMountEffect`, matching this app's `useDialogFocusTrap`-adjacent
 * conventions for global keyboard listeners.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [search, setSearch] = useState("");
  const commands = useCommandRegistry();

  useMountEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      if (event.key === "k") {
        event.preventDefault();
        setHelpOpen(false);
        setOpen((prev) => !prev);
      } else if (event.key === "/") {
        event.preventDefault();
        setOpen(true);
        setHelpOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const enabledCommands = useMemo(() => commands.filter((c) => !c.disabled), [commands]);

  const frequentCommands = useMemo(() => {
    if (search.trim().length > 0) return [];
    const ids = getFrequentCommandIds(enabledCommands);
    const byId = new Map(enabledCommands.map((c) => [c.id, c]));
    return ids.map((id) => byId.get(id)).filter((c): c is RegisteredCommand => Boolean(c));
  }, [enabledCommands, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, RegisteredCommand[]>();
    for (const command of enabledCommands) {
      const list = groups.get(command.group) ?? [];
      list.push(command);
      groups.set(command.group, list);
    }
    return GROUP_ORDER.map((group) => [group, groups.get(group) ?? []] as const).filter(
      ([, items]) => items.length > 0,
    );
  }, [enabledCommands]);

  function runCommand(command: RegisteredCommand) {
    setOpen(false);
    setSearch("");
    recordCommandUsage(command.id);
    command.perform();
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setHelpOpen(false);
      setSearch("");
    }
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      label="Command palette"
      overlayClassName={styles.overlay}
      contentClassName={styles.content}
      shouldFilter={!helpOpen}
    >
      <div className={styles.inputRow}>
        <Search size={16} aria-hidden="true" className={styles.inputIcon} />
        <CommandInput
          value={search}
          onValueChange={setSearch}
          placeholder={helpOpen ? "Search the help index..." : "Search commands, pages, actions..."}
          className={styles.input}
        />
        <button
          type="button"
          className={styles.helpToggle}
          onClick={() => setHelpOpen((prev) => !prev)}
          aria-pressed={helpOpen}
          aria-label={helpOpen ? "Back to command search" : "Show all commands and shortcuts"}
          title={helpOpen ? "Back to search" : "Help (⌘/)"}
        >
          <HelpCircle size={16} aria-hidden="true" />
        </button>
      </div>

      <CommandList className={styles.list}>
        <CommandEmpty className={styles.empty}>No matching commands.</CommandEmpty>

        {helpOpen ? (
          <HelpSections groups={grouped} />
        ) : (
          <>
            {frequentCommands.length > 0 && (
              <CommandGroup heading="Frequently used" className={styles.group}>
                {frequentCommands.map((command) => (
                  <PaletteItem key={command.id} command={command} onRun={runCommand} />
                ))}
              </CommandGroup>
            )}
            {grouped.map(([group, items]) => (
              <CommandGroup key={group} heading={group} className={styles.group}>
                {items.map((command) => (
                  <PaletteItem key={command.id} command={command} onRun={runCommand} />
                ))}
              </CommandGroup>
            ))}
          </>
        )}
      </CommandList>

      <div className={styles.footer}>
        <span>
          <Kbd keys={["↑", "↓"]} /> Navigate
        </span>
        <span>
          <Kbd keys={["Enter"]} /> Select
        </span>
        <span>
          <Kbd keys={[isMac() ? "⌘" : "Ctrl", "/"]} /> Help
        </span>
        <span>
          <Kbd keys={["Esc"]} /> Close
        </span>
      </div>
    </Command.Dialog>
  );
}

function PaletteItem({
  command,
  onRun,
}: {
  command: RegisteredCommand;
  onRun: (command: RegisteredCommand) => void;
}) {
  return (
    <CommandItem
      value={`${command.label} ${command.keywords?.join(" ") ?? ""}`}
      onSelect={() => onRun(command)}
      className={styles.item}
    >
      <span className={styles.itemLabel}>{command.label}</span>
      {command.description && <span className={styles.itemDescription}>{command.description}</span>}
      {command.shortcut && <Kbd keys={command.shortcut} className={styles.itemShortcut} />}
    </CommandItem>
  );
}

/** Help screen: every registered command, grouped, with its shortcut -- `Cmd+/`. */
function HelpSections({ groups }: { groups: (readonly [string, RegisteredCommand[]])[] }) {
  if (groups.length === 0) {
    return <div className={styles.empty}>No commands registered yet.</div>;
  }
  return (
    <>
      {groups.map(([group, items]) => (
        <CommandGroup key={group} heading={group} className={styles.group}>
          {items.map((command) => (
            <CommandItem
              key={command.id}
              value={command.label}
              onSelect={() => {}}
              className={styles.item}
            >
              <span className={styles.itemLabel}>{command.label}</span>
              {command.description && (
                <span className={styles.itemDescription}>{command.description}</span>
              )}
              {command.shortcut && <Kbd keys={command.shortcut} className={styles.itemShortcut} />}
            </CommandItem>
          ))}
        </CommandGroup>
      ))}
    </>
  );
}

export default CommandPalette;
