import { ApplicationCommandOptionType, Client, CommandInteraction, PermissionsBitField, MessageFlags } from 'discord.js';
import { SlashCommand } from '../utils/index.js';
import * as fs from 'fs/promises';

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
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({
                content: 'You do not have permission to use this command. Admin only.',
            });
            return;
        }

        const preprompt = interaction.options.get('preprompt')?.value as string;

        try {
            await fs.writeFile('preprompt.txt', preprompt);
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

export const ViewPreprompt: SlashCommand = {
    name: 'viewprompt',
    description: 'Displays the current pre-prompt configuration.',
    defaultMemberPermissions: PermissionsBitField.Flags.Administrator,
    run: async (client: Client, interaction: CommandInteraction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // Ephemeral for admin-only view

        try {
            const prepromptContent = await fs.readFile('preprompt.txt', 'utf-8');
            
            if (!prepromptContent.trim()) {
                await interaction.editReply('The preprompt file is currently empty.');
                return;
            }

            // Discord message content limit is 2000 characters.
            // Code blocks add ```
// ...
// ``` (7 chars) or ```lang
// ...
// ``` (9+ chars)
            // Aim for slightly less than 2000 for the content itself.
            const maxLength = 1980; 
            let replyContent = 'Current `preprompt.txt` content:\n```\n';
            replyContent += prepromptContent;
            replyContent += '\n```';

            if (replyContent.length > 2000) {
                // If too long, send as an attachment or truncate.
                // For simplicity here, we'll try to send a truncated message first.
                // A more robust solution might use pagination or file attachments for very long prompts.
                const truncatedContent = prepromptContent.substring(0, maxLength - 50); // Reserve space for message and code block
                replyContent = 'Current `preprompt.txt` content (truncated):\n```\n' + truncatedContent + '\n... (prompt truncated)\n```';
                // Alternative for very long: send as file if possible, or indicate it's too long to display directly.
                // For now, this will at least show something.
                 await interaction.editReply(replyContent);
            } else {
                 await interaction.editReply(replyContent);
            }

        } catch (error: any) {
            if (error.code === 'ENOENT') {
                await interaction.editReply('The `preprompt.txt` file was not found.');
            } else {
                console.error('Error reading preprompt file:', error);
                await interaction.editReply('Failed to read the preprompt file.');
            }
        }
    },
};