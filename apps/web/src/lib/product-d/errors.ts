type ProductDError = {
  message?: string | null;
};

export function productDErrorMessage(error: ProductDError) {
  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("active staff account required") || message.includes("permission")) {
    return "You do not have permission to perform this action.";
  }
  if (message.includes("note body is required")) return "Add a factual note before saving.";
  if (message.includes("final message is required") || message.includes("complete draft")) {
    return "Complete the outreach draft before continuing.";
  }
  if (message.includes("do not contact") || message.includes("requested no contact")) {
    return "This member cannot receive outreach.";
  }
  if (message.includes("cooldown") || message.includes("retry is not eligible")) {
    return "This outreach is not yet eligible for another attempt.";
  }

  return "We couldn't update the retention case. Please try again.";
}
