import { SlashCommand } from '../utils/commands.js';
import { Client, CommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { getEnvVar } from '../utils/env.js';
import { getUserConfig, UserConfig } from '../utils/handlers/configHandler.js';
import fs from 'fs';
import path from 'path';

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

export const ActiveModel: SlashCommand = {
    name: 'activemodel',
    description: 'Displays your currently selected Ollama model.',
    run: async (client: Client, interaction: CommandInteraction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const filename = `${interaction.user.username}-config.json`;

        try {
            const userConfig: UserConfig | undefined = await new Promise((resolve, reject) => {
                getUserConfig(filename, (config) => {
                    // Check if the config is undefined AND the file doesn't exist.
                    // This helps distinguish "no config file" from "file exists but is malformed/empty".
                    if (config === undefined && !fs.existsSync(path.join('data', filename))) { 
                        resolve(undefined); 
                    } else {
                        // If config is defined, or if file exists (even if config is undefined due to malformation),
                        // pass it along. The later checks will handle !userConfig or missing options.
                        resolve(config);
                    }
                });
            });

            if (!userConfig || !userConfig.options || typeof userConfig.options['switch-model'] !== 'string') {
                const defaultModel = getEnvVar('MODEL', 'phi3'); // Default to phi3 if MODEL isn't set in .env
                await interaction.editReply(
                    `You do not have a specific model configured. The current default model is \`${defaultModel}\`. ` +
                    `Use \`/switchmodel\` to set a personal preference.`
                );
            } else {
                const activeModel = userConfig.options['switch-model'];
                await interaction.editReply(`Your currently active model is: \`${activeModel}\`.`);
            }

        } catch (error: any) { 
            console.error(`Error getting active model for ${interaction.user.username}:`, error);
            await interaction.editReply('Sorry, I encountered an error trying to fetch your active model information.');
        }
    },
};
