/**
 * Normalizes execution input by converting escaped characters to actual characters.
 * This is used at execution time to convert CSV-escaped strings (like "\\n") 
 * into actual newlines before passing to code execution.
 * 
 * @param input - Raw input string that may contain escaped characters
 * @returns Normalized input with actual newlines, tabs, etc.
 */
export const normalizeExecutionInput = (input: string | null | undefined): string => {
  if (input === undefined || input === null) return '';

  // First, handle double-escaped sequences (like \\n in CSV becomes \n in string)
  // Then convert single-escaped sequences to actual characters
  let normalized = input
    .replace(/\\\\/g, '\\')     // Convert \\ to \ (handle double backslashes first)
    .replace(/\\r\\n/g, '\n')   // Convert \r\n to newline
    .replace(/\\n/g, '\n')      // Convert \n to newline
    .replace(/\\t/g, '\t')      // Convert \t to tab
    .replace(/\\r/g, '\n')      // Convert \r to newline
    .replace(/\r\n/g, '\n')     // Normalize Windows line endings
    .replace(/\r/g, '\n');      // Normalize old Mac line endings

  // Remove trailing backslashes that might be left after normalization
  normalized = normalized.replace(/\\+$/, '');

  return normalized;     // Trim leading/trailing whitespace
};