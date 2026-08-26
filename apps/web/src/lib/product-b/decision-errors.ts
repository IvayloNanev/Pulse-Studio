type DatabaseError = {
  code?: string;
  message?: string;
};

export function productBDecisionErrorMessage(error: DatabaseError) {
  const message = (error.message ?? "").toLowerCase();

  if (error.code === "23505" || message.includes("product_b_one_open_decision") || message.includes("duplicate key")) {
    return "An open decision already exists for this session.";
  }
  if (message.includes("session is not currently underbooked")) {
    return "This session no longer requires an underbooking decision.";
  }
  if (message.includes("owner/admin access required") || message.includes("permission denied") || message.includes("product b session access required")) {
    return "You do not have permission to perform this action.";
  }
  if (message.includes("invalid product b operational action")) {
    return "Choose a valid operational action.";
  }
  return "We couldn't save the decision. Please try again.";
}
