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
 * Matches agent IDs, full names, first names, and last names (case-insensitive, Unicode-aware).
 * Uses word-boundary matching for flexible detection.
 * Returns deduplicated list of agent IDs sorted by match position (order they appear in text).
 * Excludes the specified agentId (typically the speaker).
 * 
 * Example:
 *   text: "ให้ Sebas ทำ UI แล้วให้ Alice ทำ API"
 *   agents: [{id: "main", name: "Sebas Tian"}, {id: "alice", name: "Alice"}]
 *   excludeAgentId: "bob"
 *   result: ["main", "alice"] (in order of appearance)
 * 
 * Rules:
 *   - Full name: "Sebas Tian" ✓ detected
 *   - First name: "Sebas" ✓ detected (matches first word of name)
 *   - Last name: "Tian" ✓ detected (matches last word of name)
 *   - Partial: "Seb" ✗ NOT detected, "Ti" ✗ NOT detected
 */
export function parseLoopMentions(
    text: string,
    agents: Array<{ agentId: string; name: string }>,
    excludeAgentId?: string
): string[] {
    const textLower = text.toLowerCase();
    const matches: Array<{ agentId: string; position: number; priority: number }> = [];

    for (const agent of agents) {
        // Skip self
        if (excludeAgentId && agent.agentId === excludeAgentId) {
            continue;
        }

        const nameLower = agent.name.toLowerCase();
        const idLower = agent.agentId.toLowerCase();
        const nameParts = nameLower.split(/\s+/); // Split by whitespace

        // Candidate strings to search for (in priority order)
        // Priority: agentId (1) > full name (2) > first name (3) > last name (4)
        const candidates = [
            { text: idLower, priority: 1 },
            { text: nameLower, priority: 2 },
            { text: nameParts[0], priority: 3 }, // first name
            { text: nameParts[nameParts.length - 1], priority: 4 }, // last name
        ];

        let bestMatch = -1;
        let bestPriority = 999;

        for (const candidate of candidates) {
            if (!candidate.text || candidate.text.length === 0) {
                continue;
            }

            // Try to find exact word-boundary match in text
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
                    if (bestMatch === -1 || pos < bestMatch || (pos === bestMatch && candidate.priority < bestPriority)) {
                        bestMatch = pos;
                        bestPriority = candidate.priority;
                    }
                }
            }
        }

        // If found any match for this agent, record position
        if (bestMatch >= 0) {
            matches.push({ agentId: agent.agentId, position: bestMatch, priority: bestPriority });
        }
    }

    // Sort by position (order of appearance), then by priority
    matches.sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return a.priority - b.priority;
    });
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
