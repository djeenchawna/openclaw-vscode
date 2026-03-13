import { ProjectConfig, ProjectSkill } from './projectScanner';

export interface BuildResult {
    message: string;
    triggeredSkill: ProjectSkill | null;
    workflowIncluded: boolean;
}

/**
 * Check if content is a sentinel message (NO_REPLY, HEARTBEAT_OK)
 * Filters out system-level responses that shouldn't be displayed in chat
 * Works for both normal messages and messages ending with sentinel
 */
export function isSentinelMessage(content: string): boolean {
    const trimmed = content.trim();
    return (
        trimmed === 'NO_REPLY' ||
        trimmed === 'HEARTBEAT_OK' ||
        trimmed.endsWith('HEARTBEAT_OK')
    );
}

export class MessageBuilder {
    // Track which sessions have received workflow
    private workflowSent = new Set<string>();

    build(
        userMessage: string,
        config: ProjectConfig | null,
        matchedSkill: ProjectSkill | null,
        sessionKey: string
    ): BuildResult {
        const parts: string[] = [];
        let workflowIncluded = false;

        if (config) {
            // Matched skill only (workflows are not auto-injected)
            if (matchedSkill) {
                parts.push(`[skill:${matchedSkill.name}]\n${matchedSkill.content}`);
            }
        }

        // 3. User message
        parts.push(userMessage);

        return {
            message: parts.join('\n\n'),
            triggeredSkill: matchedSkill,
            workflowIncluded,
        };
    }
    
    resetSession(sessionKey: string) {
        this.workflowSent.delete(sessionKey);
    }
    
    resetAll() {
        this.workflowSent.clear();
    }
}

let instance: MessageBuilder | null = null;

export function getMessageBuilder(): MessageBuilder {
    if (!instance) {
        instance = new MessageBuilder();
    }
    return instance;
}
