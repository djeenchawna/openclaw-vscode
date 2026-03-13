/**
 * mentionParser.ts
 * Utilities for parsing @mentions in group chat messages.
 */

/**
 * Parse @mentions from message text.
 * Matches both agent IDs and agent names (case-insensitive, Unicode-aware).
 * Also matches first-name-only (e.g., "@Sebas" matches "Sebas Tian").
 * Always returns deduplicated list of agent IDs.
 */
export function parseMentions(text: string, agents: Array<{ agentId: string; name: string }>): string[] {
    const mentionRegex = /@([\w\u0E00-\u0E7F][\w\u0E00-\u0E7F-]*)/g;
    const mentioned: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(text)) !== null) {
        const token = match[1].toLowerCase();
        const found = agents.find(a => {
            const nameLower = a.name.toLowerCase();
            const idLower = a.agentId.toLowerCase();
            // Exact match on agentId or full name
            if (idLower === token || nameLower === token) {
                return true;
            }
            // Match first word of name (e.g., "@Sebas" matches "Sebas Tian")
            const firstName = nameLower.split(/\s+/)[0];
            return firstName === token;
        });
        if (found && !mentioned.includes(found.agentId)) {
            mentioned.push(found.agentId);
        }
    }
    return mentioned;
}

/**
 * Get the @mention query at the cursor position (for autocomplete).
 * Returns null if cursor is not inside a @word or if there's whitespace after @.
 * Returns '' if cursor is right after @.
 */
export function getMentionQuery(text: string, cursorPos: number): string | null {
    const before = text.substring(0, cursorPos);
    const atIndex = before.lastIndexOf('@');

    if (atIndex === -1) {
        return null;
    }

    // Check that there's no space in the range [@...cursor]
    const query = before.substring(atIndex + 1);
    if (/\s/.test(query)) {
        return null;
    }

    return query;
}

/**
 * Replace a partial @mention at cursor with the chosen agent name.
 * Returns the updated text and the new cursor position.
 */
export function insertMention(
    text: string,
    cursorPos: number,
    agentId: string
): { text: string; cursor: number } {
    const before = text.substring(0, cursorPos);
    const after = text.substring(cursorPos);
    const atIndex = before.lastIndexOf('@');

    if (atIndex === -1) {
        return { text, cursor: cursorPos };
    }

    const prefix = before.substring(0, atIndex);
    const inserted = `@${agentId} `;
    const newText = prefix + inserted + after;
    const newCursor = atIndex + inserted.length;

    return { text: newText, cursor: newCursor };
}
