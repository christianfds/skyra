import { LanguageKeys } from '#lib/i18n/languageKeys';
import { SkyraCommand } from '#lib/structures';
import { fetchGraphQLPokemon, getFuzzyItem, parseBulbapediaURL } from '#utils/APIs/Pokemon';
import { CdnUrls } from '#utils/constants';
import { formatNumber } from '#utils/functions';
import { ApplyOptions } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';
import { toTitleCase } from '@sapphire/utilities';
import { PermissionFlagsBits } from 'discord-api-types/v9';
import { Message, MessageEmbed } from 'discord.js';

@ApplyOptions<SkyraCommand.Options>({
	aliases: ['pokeitem', 'bag'],
	description: LanguageKeys.Commands.Pokemon.ItemDescription,
	detailedDescription: LanguageKeys.Commands.Pokemon.ItemExtended,
	requiredClientPermissions: [PermissionFlagsBits.EmbedLinks]
})
export class UserCommand extends SkyraCommand {
	public async messageRun(message: Message, args: SkyraCommand.Args) {
		const item = (await args.rest('string')).toLowerCase();
		const { t } = args;

		const itemDetails = await this.fetchAPI(item);

		const embedTranslations = t(LanguageKeys.Commands.Pokemon.ItemEmbedData, {
			availableInGen8: t(itemDetails.isNonstandard === 'Past' ? LanguageKeys.Globals.No : LanguageKeys.Globals.Yes)
		});

		const externalResources = [
			`[Bulbapedia](${parseBulbapediaURL(itemDetails.bulbapediaPage)} )`,
			`[Serebii](${itemDetails.serebiiPage})`,
			itemDetails.smogonPage ? `[Smogon](${itemDetails.smogonPage})` : undefined
		]
			.filter(Boolean)
			.join(' | ');

		const embed = new MessageEmbed()
			.setColor(await this.container.db.fetchColor(message))
			.setAuthor({ name: `${embedTranslations.ITEM} - ${toTitleCase(itemDetails.name)}`, iconURL: CdnUrls.Pokedex })
			.setThumbnail(itemDetails.sprite)
			.setDescription(itemDetails.desc)
			.addField(embedTranslations.generationIntroduced, formatNumber(t, itemDetails.generationIntroduced), true)
			.addField(embedTranslations.availableInGeneration8Title, embedTranslations.availableInGeneration8Data, true)
			.addField(t(LanguageKeys.System.PokedexExternalResource), externalResources);
		return send(message, { embeds: [embed] });
	}

	private async fetchAPI(item: string) {
		try {
			const {
				data: { getFuzzyItem: result }
			} = await fetchGraphQLPokemon<'getFuzzyItem'>(getFuzzyItem, { item });

			if (!result.length) {
				this.error(LanguageKeys.Commands.Pokemon.ItemQueryFail, { item });
			}

			return result[0];
		} catch {
			this.error(LanguageKeys.Commands.Pokemon.ItemQueryFail, { item });
		}
	}
}
