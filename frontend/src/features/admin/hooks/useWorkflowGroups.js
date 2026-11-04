import {
  requestGroups,
  requestGroup,
  requestGroupMembers,
  requestGroupGrants,
} from "../api.js";
import {
  authHeaders,
  parseTextResponse as parseResponse,
} from "../../../shared/api/http.js";
import { message } from "antd";
export function useWorkflowGroups({
  groups,
  selectedGroupId,
  workflowSteps,
  setWorkflowSteps,
  users,
  auth,
  loadGroups,
  groupName,
  groupKind,
  setGroupName,
  setSelectedGroupId,
  tr,
  t,
}) {
  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) || null;

  const moveWorkflowStep = (index, direction) => {
    const next = [...workflowSteps];
    const target = index + direction;
    if (target < 0 || target >= next.length) {
      return;
    }
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setWorkflowSteps(next);
  };

  const groupMemberOptions = users
    .filter(
      (user) =>
        user.role ===
          (selectedGroup?.kind === "reviewer" ? "reviewer" : "student") &&
        user.status !== "disabled",
    )
    .map((user) => ({
      value: user.username,
      label: `${user.displayName || user.username} (${user.username})`,
    }));

  const studentGroupOptions = groups
    .filter((group) => group.kind === "student")
    .map((group) => ({ value: group.id, label: group.name }));

  const createGroup = async () => {
    try {
      const response = await requestGroups({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({ name: groupName.trim(), kind: groupKind }),
      });
      const payload = await parseResponse(response);
      if (!response.ok)
        throw new Error(payload?.message || "Unable to create group");
      setGroupName("");
      await loadGroups();
    } catch (error) {
      message.error(tr(error.message));
    }
  };

  const deleteGroup = async (groupId) => {
    const response = await requestGroup(groupId, {
      method: "DELETE",
      headers: authHeaders(auth.token),
    });
    if (response.ok) {
      if (selectedGroupId === groupId) setSelectedGroupId(null);
      await loadGroups();
    }
  };

  const saveGroupMembers = async (userIds) => {
    if (!selectedGroup) {
      return;
    }
    const response = await requestGroupMembers(selectedGroup.id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(auth.token),
      },
      body: JSON.stringify({ userIds }),
    });
    const payload = await parseResponse(response);
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to save members");
    }
    await loadGroups();
    message.success(t("Group members saved"));
  };

  const saveGroupGrants = async (studentGroupIds) => {
    if (!selectedGroup) {
      return;
    }
    const response = await requestGroupGrants(selectedGroup.id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(auth.token),
      },
      body: JSON.stringify({ studentGroupIds }),
    });
    const payload = await parseResponse(response);
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to save grants");
    }
    await loadGroups();
    message.success(t("Reviewer grants saved"));
  };
  return {
    selectedGroup,
    moveWorkflowStep,
    groupMemberOptions,
    studentGroupOptions,
    createGroup,
    deleteGroup,
    saveGroupMembers,
    saveGroupGrants,
  };
}
