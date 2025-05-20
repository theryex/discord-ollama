import { ApplicationCommandOptionType, Client, CommandInteraction, PermissionsBitField } from 'discord.js';
import { SlashCommand } from '../utils/index.js';
import { exec as callbackExec } from 'child_process';
import * as fs from 'fs/promises';
import { promisify } from 'util';

const exec = promisify(callbackExec);

// Helper function to send output, splitting if necessary
async function sendSplittableOutput(
    interaction: CommandInteraction,
    baseContent: string,
    output: string
) {
    const MAX_CONTENT_LENGTH = 1980;
    const formattedOutput = '```\n' + output + '\n```';
    const fullMessage = baseContent ? `${baseContent}\n${formattedOutput}` : formattedOutput;

    if (fullMessage.length <= 2000) {
        await interaction.editReply({
            content: fullMessage,
        });
    } else {
        let firstPart = output.slice(0, MAX_CONTENT_LENGTH);
        await interaction.editReply({
            content: (baseContent ? `${baseContent}\n` : '') + '```\n' + firstPart + '\n```',
        });
        let remainingOutput = output.slice(firstPart.length);
        if (remainingOutput.trim().length > 0) {
            if (remainingOutput.length > MAX_CONTENT_LENGTH) {
                remainingOutput = remainingOutput.slice(0, MAX_CONTENT_LENGTH - 7) + "\n... (output truncated)";
            }
            await interaction.followUp({
                content: '```\n' + remainingOutput + '\n```',
            });
        }
    }
}

export const GpuInfo: SlashCommand = {
    name: 'gpuinfo',
    description: 'Displays GPU information using nvidia-smi.',
    options: [],
    run: async (client: Client, interaction: CommandInteraction) => {
        await interaction.deferReply();
        try {
            const { stdout, stderr } = await exec('nvidia-smi');
            const output = stdout || stderr || 'No output.';
            await sendSplittableOutput(interaction, '', output);
        } catch (err: any) {
            const errorMessage = err.stderr || err.message || 'An unknown error occurred.';
            await sendSplittableOutput(interaction, 'Error retrieving GPU info:', errorMessage);
        }
    },
};

export const SetPreprompt: SlashCommand = {
    name: 'set-preprompt',
    description: "Sets the bot's pre-prompt. Admin only.",
    options: [
        {
            name: 'preprompt',
            description: 'The new pre-prompt content.',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({
                content: 'You do not have permission to use this command. Admin only.',
            });
            return;
        }

        const preprompt = interaction.options.get('preprompt')?.value as string;

        try {
            await fs.writeFile('src/preprompt.txt', preprompt);
            await interaction.editReply({
                content: 'Pre-prompt updated successfully.',
            });
        } catch (error) {
            console.error('Error writing preprompt file:', error);
            await interaction.editReply({
                content: 'Failed to update pre-prompt. Check bot logs for details.',
            });
        }
    },
};

export const Users: SlashCommand = {
    name: 'users',
    description: 'Lists active users connected to the server (via TTY/PTS).',
    options: [],
    run: async (client: Client, interaction: CommandInteraction) => {
        await interaction.deferReply();
        try {
            const { stdout, stderr } = await exec('who');
            const lines = stdout.trim().split('\n');
            const activeUserLines = lines.filter((line: string) => line.includes('pts/') || line.includes('tty'));
            let outputMessage: string;
            if (activeUserLines.length > 0) {
                outputMessage = activeUserLines.join('\n');
            } else {
                outputMessage = 'No active user sessions found (via TTY/PTS).';
            }
            if (outputMessage.length > 1950) {
                outputMessage = outputMessage.substring(0, 1950) + "\n... (output truncated)";
            }
            await sendSplittableOutput(interaction, '', outputMessage);
        } catch (err: any) {
            const errorMessage = err.stderr || err.message || 'An unknown error occurred.';
            await sendSplittableOutput(interaction, 'Error retrieving user list:', errorMessage);
        }
    },
};