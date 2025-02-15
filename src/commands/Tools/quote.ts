import { LanguageKeys } from '#lib/i18n/languageKeys';
import { SkyraCommand } from '#lib/structures';
import type { GuildMessage } from '#lib/types';
import { getContent, getImage } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';
import { cutText } from '@sapphire/utilities';
import { PermissionFlagsBits } from 'discord-api-types/v9';
import { MessageEmbed } from 'discord.js';

@ApplyOptions<SkyraCommand.Options>({
	description: LanguageKeys.Commands.Tools.QuoteDescription,
	detailedDescription: LanguageKeys.Commands.Tools.QuoteExtended,
	requiredClientPermissions: [PermissionFlagsBits.EmbedLinks],
	runIn: [CommandOptionsRunTypeEnum.GuildAny]
})
export class UserCommand extends SkyraCommand {
	public async messageRun(message: GuildMessage, args: SkyraCommand.Args) {
		const channel = await args.pick('textChannelName').catch(() => message.channel);
		const remoteMessage = await args.pick('message', { channel });

		const embed = new MessageEmbed()
			.setAuthor({
				name: remoteMessage.author.tag,
				iconURL: remoteMessage.author.displayAvatarURL({ size: 128, format: 'png', dynamic: true })
			})
			.setColor(await this.container.db.fetchColor(message))
			.setImage(getImage(remoteMessage)!)
			.setTimestamp(remoteMessage.createdAt);

		const content = getContent(remoteMessage);
		if (content) embed.setDescription(`[${args.t(LanguageKeys.Misc.JumpTo)}](${remoteMessage.url})\n${cutText(content, 1800)}`);

		return send(message, { embeds: [embed] });
	}
}
