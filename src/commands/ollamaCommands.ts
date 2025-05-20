import { SlashCommand } from '../utils/commands.js';
import { Client, CommandInteraction, EmbedBuilder } from 'discord.js';
import { getEnvVar } from '../utils/env.js';

// Assumes global fetch is available (Node.js 18+)
// If not, you might need to install and import node-fetch:
// import fetch from 'node-fetch';

export const ListModels: SlashCommand = {
    name: 'listmodels',
    description: 'Lists all available models from the Ollama instance.',
    run: async (client: Client, interaction: CommandInteraction) => {
        await interaction.deferReply();

        try {
            const ollamaIp = getEnvVar('OLLAMA_IP');
            const ollamaPort = getEnvVar('OLLAMA_PORT');
            const ollamaUrl = `http://${ollamaIp}:${ollamaPort}`;

            const response = await fetch(`${ollamaUrl}/api/tags`);
            if (!response.ok) {
                throw new Error(`Ollama API responded with status: ${response.status}`);
            }
            const data: any = await response.json();

            if (!data.models || data.models.length === 0) {
                await interaction.editReply('No models found in Ollama.');
                return;
            }

            // Format the response
            let description = data.models.map((model: any) => {
                return `**${model.name}**
Size: ${Math.round(model.size / 1024 / 1024)} MB
Modified: ${new Date(model.modified_at).toLocaleDateString()}`;
            }).join('\n\n');
            
            if (description.length > 4000) { // Embed description limit is 4096
                description = description.substring(0, 4000) + "... (list truncated)";
            }

            const embed = new EmbedBuilder()
                .setTitle('Available Ollama Models')
                .setDescription(description)
                .setColor(0x00AE86)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error: any) {
            console.error('Error fetching Ollama models:', error);
            await interaction.editReply(`Failed to fetch models from Ollama. Error: ${error.message}`);
        }
    },
};
