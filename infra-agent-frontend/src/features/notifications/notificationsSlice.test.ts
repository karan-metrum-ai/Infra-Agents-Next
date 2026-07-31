import { describe, it, expect, vi, beforeEach } from "vitest";
import reducer, {
  addNotification,
  removeNotification,
  clearAllNotifications,
} from "./notificationsSlice";
import { selectNotifications } from "./notificationsSelectors";

describe("notificationsSlice", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  it("returns empty initial state", () => {
    const state = reducer(undefined, { type: "unknown" });
    expect(state.notifications).toEqual([]);
  });

  it("addNotification appends with generated id and timestamp", () => {
    const state = reducer(
      undefined,
      addNotification({
        type: "success",
        title: "Deployed",
        message: "Team deployed successfully",
      }),
    );

    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0]).toMatchObject({
      type: "success",
      title: "Deployed",
      message: "Team deployed successfully",
      id: "notif-1000-0.5",
      timestamp: 1000,
      duration: 5000,
    });
  });

  it("addNotification respects custom duration", () => {
    const state = reducer(
      undefined,
      addNotification({ type: "error", title: "Error", duration: 0 }),
    );
    expect(state.notifications[0].duration).toBe(0);
  });

  it("addNotification stacks multiple notifications", () => {
    let state = reducer(undefined, addNotification({ type: "info", title: "First" }));
    vi.spyOn(Date, "now").mockReturnValue(2000);
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    state = reducer(state, addNotification({ type: "warning", title: "Second" }));
    expect(state.notifications).toHaveLength(2);
  });

  it("removeNotification removes by id", () => {
    let state = reducer(undefined, addNotification({ type: "info", title: "Test" }));
    const id = state.notifications[0].id;
    state = reducer(state, removeNotification(id));
    expect(state.notifications).toHaveLength(0);
  });

  it("removeNotification is a no-op for unknown id", () => {
    let state = reducer(undefined, addNotification({ type: "info", title: "Test" }));
    state = reducer(state, removeNotification("does-not-exist"));
    expect(state.notifications).toHaveLength(1);
  });

  it("clearAllNotifications empties the list", () => {
    let state = reducer(undefined, addNotification({ type: "info", title: "A" }));
    vi.spyOn(Date, "now").mockReturnValue(2000);
    state = reducer(state, addNotification({ type: "info", title: "B" }));
    state = reducer(state, clearAllNotifications());
    expect(state.notifications).toHaveLength(0);
  });
});

describe("notificationsSlice selectors", () => {
  it("selectNotifications returns the notifications array", () => {
    const state = {
      notifications: {
        notifications: [
          { id: "1", type: "info" as const, title: "Test", timestamp: 1000, duration: 5000 },
        ],
      },
    };
    expect(selectNotifications(state)).toHaveLength(1);
    expect(selectNotifications(state)[0].title).toBe("Test");
  });
});
