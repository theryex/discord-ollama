import { ApplicationCommandOptionType, Client, CommandInteraction, MessageFlags } from 'discord.js';
import { SlashCommand } from '../utils/index.js'; // Assuming SlashCommand type is defined here
import { exec as callbackExec } from 'child_process';
import { promisify } from 'util';

const exec = promisify(callbackExec);

// Helper function to send output, splitting if necessary
async function sendSplittableOutput(
    interaction: CommandInteraction,
    baseContent: string,
    output: string,
    isEphemeral: boolean = true
) {
    const MAX_CONTENT_LENGTH = 1980; // Leave some room for "```\n" and "\n```" (2000 limit)
    const formattedOutput = '```\n' + output + '\n```';
    const fullMessage = baseContent ? `${baseContent}\n${formattedOutput}` : formattedOutput;

    if (fullMessage.length <= 2000) {
        await interaction.editReply({
            content: fullMessage,
            ephemeral: isEphemeral,
        });
    } else {
        // Send first part
        let firstPart = output.slice(0, MAX_CONTENT_LENGTH - (baseContent ? baseContent.length + 8 : 7)); // Adjust for baseContent and backticks
        // Ensure we don't cut in the middle of a multi-byte character or escape sequence if that's a concern
        // For simple text output like nvidia-smi or who, direct slice is usually fine.

        await interaction.editReply({
            content: (baseContent ? `${baseContent}\n` : '') + '```\n' + firstPart + '\n```',
            flags: isEphemeral ? MessageFlags.Ephemeral : undefined,
        });

        // Send second part (and potentially more, though the request was for two)
        let remainingOutput = output.slice(firstPart.length);
        if (remainingOutput.trim().length > 0) {
            // If remainingOutput is still too long, truncate the follow-up.
            if (remainingOutput.length > MAX_CONTENT_LENGTH) {
                remainingOutput = remainingOutput.slice(0, MAX_CONTENT_LENGTH - 7) + "\n... (output truncated)";
            }
            await interaction.followUp({
                content: '```\n' + remainingOutput + '\n```',
                flags: isEphemeral ? MessageFlags.Ephemeral : undefined,
            });
        }
    }
}


// Command to get GPU info using nvidia-smi
export const GpuInfo: SlashCommand = {
    name: 'gpuinfo',
    description: 'Displays GPU information using nvidia-smi.',
    options: [], // No options needed
    run: async (client: Client, interaction: CommandInteraction) => {
        await interaction.deferReply({ ephemeral: true }); // Assuming ephemeral is desired

        try {
            const { stdout, stderr } = await exec('nvidia-smi');

            if (stderr && !stdout) { // If only stderr has content, it might be an error/warning
                await interaction.editReply({
                    content: `Could not retrieve full GPU info. Output (stderr):\n\`\`\`\n${stderr.slice(0,1900)}\n\`\`\``,
                    // flags: MessageFlags.Ephemeral already set by deferReply if using its option
                });
                return;
            }

            const output = stdout.trim() || 'No output from nvidia-smi.';
            const MAX_CHARS_PER_MESSAGE = 1950; // Max characters for each message part (leaving room for formatting)

            if (output.length <= MAX_CHARS_PER_MESSAGE) {
                await interaction.editReply({
                    content: '```\n' + output + '\n```',
                });
            } else {
                const part1 = output.substring(0, MAX_CHARS_PER_MESSAGE);
                const part2 = output.substring(MAX_CHARS_PER_MESSAGE);

                await interaction.editReply({
                    content: '```\n' + part1 + '\n```',
                });

                if (part2.trim().length > 0) {
                    await interaction.followUp({
                        content: '```\n' + part2.substring(0, MAX_CHARS_PER_MESSAGE) + (part2.length > MAX_CHARS_PER_MESSAGE ? "\n... (output truncated)" : "") + '\n```',
                        ephemeral: true, // followUp also needs ephemeral flag
                    });
                }
            }
        } catch (error: any) {
            console.error('Error executing nvidia-smi:', error);
            const errorMessage = error.stderr || error.message || 'An unknown error occurred.';
            await interaction.editReply({
                content: `Error retrieving GPU info:\n\`\`\`\n${errorMessage.slice(0,1900)}\n\`\`\``,
            });
        }
    },
};

// Command to get active SSH clients (users)
export const Users: SlashCommand = { // Renamed from SshClients to Users to match /users command
    name: 'users',
    description: 'Lists active users connected to the server (via TTY/PTS).',
    options: [], // No options needed
    run: async (client: Client, interaction: CommandInteraction) => {
        await interaction.deferReply({ ephemeral: true }); // Assuming ephemeral is desired

        try {
            const { stdout, stderr } = await exec('who');

            if (error && !stdout) { // If only stderr has content, it might be an error/warning
                await interaction.editReply({
                    content: `Could not retrieve full user info. Output (stderr):\n\`\`\`\n${stderr.slice(0,1900)}\n\`\`\``,
                });
                return;
            }
            
            const lines = stdout.trim().split('\n');
            // Filter for lines indicating terminal sessions (pts for SSH/remote, tty for local)
            // You might want to adjust this filter based on what `who` outputs on your system
            // and what you consider an "active SSH terminal"
            const activeUserLines = lines.filter(line => line.includes('pts/') || line.includes('tty'));

            let outputMessage: string;
            if (activeUserLines.length > 0) {
                outputMessage = activeUserLines.join('\n');
            } else {
                outputMessage = 'No active user sessions found (via TTY/PTS).';
            }
            
            // The output of 'who' is typically short, but good to handle potential length
            if (outputMessage.length > 1950) {
                 outputMessage = outputMessage.substring(0, 1950) + "\n... (output truncated)";
            }

            await interaction.editReply({
                content: '```\n' + outputMessage + '\n```',
            });

        } catch (error: any) {
            console.error('Error executing who:', error);
            const errorMessage = error.stderr || error.message || 'An unknown error occurred.';
            await interaction.editReply({
                content: `Error retrieving user list:\n\`\`\`\n${errorMessage.slice(0,1900)}\n\`\`\``,
            });
        }
    },
};

// You would then export these commands, perhaps in an array for your command handler:
// export const commands = [GpuInfo, Users];