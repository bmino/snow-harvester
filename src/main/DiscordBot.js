const Discord = require('discord.js');

const DiscordBot = {
    client: new Discord.Client(),

    login(token) {
        console.log('DiscordBot: Logging in ...');
        DiscordBot.client.login(token);
        return new Promise((resolve, reject) => {
            DiscordBot.client.on('ready', resolve);
        });
    },

    sendMessage(message, channelId) {
        console.log('DiscordBot: Sending message ...');
        DiscordBot.client.channels.cache.get(channelId).send(message);
    },

};

module.exports = DiscordBot;
