const { Client, MessageEmbed } = require('discord.js');

const DiscordBot = {
    client: new Client(),

    login(token) {
        console.log('DiscordBot: Logging in ...');
        DiscordBot.client.login(token);
        return new Promise((resolve, reject) => {
            DiscordBot.client.on('ready', resolve);
        });
    },

    makeEmbed(embedObject) {
        let embed = new MessageEmbed()
            .setTitle(embedObject.Title)
            .setColor(embedObject.Color)
            .setTimestamp()
            .setDescription(embedObject.Description);
        if (embedObject.Fields != undefined) {
            embedObject.Fields.forEach( (element) => {
                embed.addField(element.name,element.value,true)
            });
        };
        if (embedObject.Thumbnail != undefined) {
            embed.setThumbnail(embedObject.Thumbnail);
        };
        if (embedObject.Footer != undefined) {
            embed.setFooter(embedObject.Footer);
        }
        if (embedObject.URL != undefined) {
            embed.setURL(embedObject.URL);
        }
        return embed;
    },

    sendMessage(message, channelId) {
        console.log('DiscordBot: Sending message ...');
        DiscordBot.client.channels.cache.get(channelId).send(message);
    },

};



module.exports = DiscordBot;
