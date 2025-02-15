import { configurableGroups, isSchemaGroup, isSchemaKey, readSettings, remove, reset, SchemaKey, set, writeSettings } from '#lib/database';
import { LanguageKeys } from '#lib/i18n/languageKeys';
import { SettingsMenu, SkyraCommand } from '#lib/structures';
import type { GuildMessage } from '#lib/types';
import { PermissionLevels } from '#lib/types/Enums';
import { isValidCustomEmoji, isValidSerializedTwemoji, isValidTwemoji } from '#lib/util/functions/emojis';
import { filter, map } from '#utils/common';
import { inlineCode } from '@discordjs/builders';
import { ApplyOptions, RequiresClientPermissions } from '@sapphire/decorators';
import { CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';
import { toTitleCase } from '@sapphire/utilities';
import { PermissionFlagsBits } from 'discord-api-types/v9';

@ApplyOptions<SkyraCommand.Options>({
	aliases: ['settings', 'config', 'configs', 'configuration'],
	description: LanguageKeys.Commands.Admin.ConfDescription,
	detailedDescription: LanguageKeys.Commands.Admin.ConfExtended,
	guarded: true,
	permissionLevel: PermissionLevels.Administrator,
	runIn: [CommandOptionsRunTypeEnum.GuildAny],
	subCommands: ['set', { input: 'add', output: 'set' }, 'show', 'remove', 'reset', { input: 'menu', default: true }]
})
export class UserCommand extends SkyraCommand {
	@RequiresClientPermissions(PermissionFlagsBits.EmbedLinks)
	public menu(message: GuildMessage, args: SkyraCommand.Args, context: SkyraCommand.Context) {
		return new SettingsMenu(message, args.t).init(context);
	}

	public async show(message: GuildMessage, args: SkyraCommand.Args) {
		const key = args.finished ? '' : await args.pick('string');
		const schemaValue = configurableGroups.getPathString(key.toLowerCase());
		if (schemaValue === null) this.error(LanguageKeys.Commands.Admin.ConfGetNoExt, { key });

		const output = await readSettings(message.guild, (settings) => {
			return schemaValue.display(settings, args.t);
		});

		if (isSchemaKey(schemaValue)) {
			return send(message, {
				content: args.t(LanguageKeys.Commands.Admin.ConfGet, { key: schemaValue.name, value: output }),
				allowedMentions: { users: [], roles: [] }
			});
		}

		const title = key ? `: ${key.split('.').map(toTitleCase).join('/')}` : '';
		return send(message, {
			content: args.t(LanguageKeys.Commands.Admin.Conf, { key: title, list: output }),
			allowedMentions: { users: [], roles: [] }
		});
	}

	public async set(message: GuildMessage, args: SkyraCommand.Args) {
		const [key, schemaKey] = await this.fetchKey(args);
		const response = await writeSettings(message.guild, async (settings) => {
			await set(settings, schemaKey, args);
			return schemaKey.display(settings, args.t);
		});

		return send(message, {
			content: args.t(LanguageKeys.Commands.Admin.ConfUpdated, { key, response: this.getTextResponse(response) }),
			allowedMentions: { users: [], roles: [] }
		});
	}

	public async remove(message: GuildMessage, args: SkyraCommand.Args) {
		const [key, schemaKey] = await this.fetchKey(args);
		const response = await writeSettings(message.guild, async (settings) => {
			await remove(settings, schemaKey, args);
			return schemaKey.display(settings, args.t);
		});

		return send(message, {
			content: args.t(LanguageKeys.Commands.Admin.ConfUpdated, { key, response: this.getTextResponse(response) }),
			allowedMentions: { users: [], roles: [] }
		});
	}

	public async reset(message: GuildMessage, args: SkyraCommand.Args) {
		const [key, schemaKey] = await this.fetchKey(args);
		const response = await writeSettings(message.guild, async (settings) => {
			reset(settings, schemaKey);
			return schemaKey.display(settings, args.t);
		});

		return send(message, {
			content: args.t(LanguageKeys.Commands.Admin.ConfReset, { key, value: response }),
			allowedMentions: { users: [], roles: [] }
		});
	}

	private getTextResponse(response: string) {
		return isValidCustomEmoji(response) || isValidSerializedTwemoji(response) || isValidTwemoji(response) ? response : inlineCode(response);
	}

	private async fetchKey(args: SkyraCommand.Args) {
		const key = await args.pick('string');
		const value = configurableGroups.getPathString(key.toLowerCase());
		if (value === null) this.error(LanguageKeys.Commands.Admin.ConfGetNoExt, { key });
		if (value.dashboardOnly) this.error(LanguageKeys.Commands.Admin.ConfDashboardOnlyKey, { key });
		if (isSchemaGroup(value)) {
			this.error(LanguageKeys.Settings.Gateway.ChooseKey, {
				keys: [
					...map(
						filter(value.childValues(), (value) => !value.dashboardOnly),
						(value) => `\`${value.name}\``
					)
				]
			});
		}

		return [value.name, value as SchemaKey] as const;
	}
}
