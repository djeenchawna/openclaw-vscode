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
 * Parse agent mentions from plain text (no @ prefix required).
 * Matches agent IDs, full names, and first-name-only (case-insensitive, Unicode-aware).
 * Uses substring/partial matching for flexible detection.
 * Returns deduplicated list of agent IDs sorted by match position (order they appear in text).
 * Excludes the specified agentId (typically the speaker).
 * 
 * Example:
 *   text: "ให้ Sebas ทำ UI แล้วให้ Alice ทำ API"
 *   agents: [{id: "main", name: "Sebas Tian"}, {id: "alice", name: "Alice"}]
 *   excludeAgentId: "bob"
 *   result: ["main", "alice"] (in order of appearance)
 */
export function parseLoopMentions(
    text: string,
    agents: Array<{ agentId: string; name: string }>,
    excludeAgentId?: string
): string[] {
    const textLower = text.toLowerCase();
    const matches: Array<{ agentId: string; position: number }> = [];

    for (const agent of agents) {
        // Skip self
        if (excludeAgentId && agent.agentId === excludeAgentId) {
            continue;
        }

        const nameLower = agent.name.toLowerCase();
        const idLower = agent.agentId.toLowerCase();

        // Candidate strings to search for (in priority order: agentId, full name, first name)
        const candidates = [
            { text: idLower, priority: 1 },
            { text: nameLower, priority: 2 },
            { text: nameLower.split(/\s+/)[0], priority: 3 }, // first word only
        ];

        let bestMatch = -1;

        for (const candidate of candidates) {
            if (!candidate.text || candidate.text.length === 0) {
                continue;
            }

            // Use case-insensitive substring search
            // Only match if it's a word boundary (not in the middle of another word)
            const pos = textLower.indexOf(candidate.text);
            if (pos >= 0) {
                // Check word boundaries: before & after should be space or punctuation, not alphanumeric
                const charBefore = pos > 0 ? textLower[pos - 1] : ' ';
                const charAfter = pos + candidate.text.length < textLower.length
                    ? textLower[pos + candidate.text.length]
                    : ' ';

                const isWordBoundaryBefore = /[\s\u0E00-\u0E7F!,.;:?()[\]{}—\-—–]/.test(charBefore) || pos === 0;
                const isWordBoundaryAfter = /[\s\u0E00-\u0E7F!,.;:?()[\]{}—\-—–]/.test(charAfter) || pos + candidate.text.length === textLower.length;

                if (isWordBoundaryBefore && isWordBoundaryAfter) {
                    if (bestMatch === -1 || pos < bestMatch) {
                        bestMatch = pos;
                    }
                }
            }
        }

        // If found any match for this agent, record position
        if (bestMatch >= 0) {
            matches.push({ agentId: agent.agentId, position: bestMatch });
        }
    }

    // Sort by position (order of appearance) and return deduplicated agentIds
    matches.sort((a, b) => a.position - b.position);
    return matches.map(m => m.agentId);
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
