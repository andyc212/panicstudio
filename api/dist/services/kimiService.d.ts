export interface KimiMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export declare function streamChatCompletion(messages: KimiMessage[]): AsyncGenerator<string, void, unknown>;
export declare function buildPromptFromForm(formData: {
    plcModel: string;
    scenario: string;
    ioList: Array<{
        address: string;
        type: string;
        name: string;
        description: string;
    }>;
    processFlow: Array<{
        description: string;
        condition?: string;
        delayMs?: number;
    }>;
    safetyConditions: Array<{
        description: string;
        enabled: boolean;
        ioRef?: string;
    }>;
    controlModes: string[];
    additionalNotes?: string;
}): string;
//# sourceMappingURL=kimiService.d.ts.map