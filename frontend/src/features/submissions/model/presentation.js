export function reviewDecisionColor(decision) {
  if (decision === "approved") {
    return "green";
  }
  if (decision === "reject" || decision === "rejected") {
    return "red";
  }
  return "default";
}

export function thesisStatusColor(status) {
  if (status === "draft") {
    return "default";
  }
  if (status === "reviewing") {
    return "gold";
  }
  if (status === "approved") {
    return "green";
  }
  if (status === "archived") {
    return "purple";
  }
  if (status === "rejected" || status === "reject") {
    return "red";
  }
  return "default";
}
