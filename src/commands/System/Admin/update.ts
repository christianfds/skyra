import { codeBlock, exec, sleep } from '@klasa/utils';
import { SkyraCommand, SkyraCommandOptions } from '@lib/structures/SkyraCommand';
import { PermissionLevels } from '@lib/types/Enums';
import { ApplyOptions } from '@skyra/decorators';
import { Emojis } from '@utils/constants';
import { cutText } from '@utils/util';
import { KlasaMessage } from 'klasa';

@ApplyOptions<SkyraCommandOptions>({
	aliases: ['pull'],
	description: 'Update the bot',
	guarded: true,
	permissionLevel: PermissionLevels.BotOwner,
	usage: '[branch:string]'
})
export default class extends SkyraCommand {

	public async run(message: KlasaMessage, [branch = 'master']: [string?]) {
		await this.fetch(message, branch);
		await this.updateDependencies(message);
		await this.compile(message);
	}

	private async compile(message: KlasaMessage) {
		const { stderr, code } = await this.exec('yarn build');
		if (code !== 0 && stderr.length) throw stderr.trim();
		return message.channel.send(`${Emojis.GreenTick} Successfully compiled.`);
	}

	private async updateDependencies(message: KlasaMessage) {
		const { stderr, code } = await this.exec('yarn install --frozen-lockfile');
		if (code !== 0 && stderr.length) throw stderr.trim();
		return message.channel.send(`${Emojis.GreenTick} Successfully updated dependencies.`);
	}

	private async fetch(message: KlasaMessage, branch: string) {
		await this.exec('git fetch');
		const { stdout, stderr } = await this.exec(`git pull origin ${branch}`);

		// If it's up to date, do nothing
		if (/already up(?: |-)to(?: |-)date/i.test(stdout)) throw `${Emojis.GreenTick} Up to date.`;

		// If it was not a successful pull, return the output
		if (!this.isSuccessfulPull(stdout)) {
			// If the pull failed because it was in a different branch, run checkout
			if (!await this.isCurrentBranch(branch)) {
				return this.checkout(message, branch);
			}

			// If the pull failed because local changes, run a stash
			if (this.needsStash(stdout + stderr)) return this.stash(message);
		}

		// For all other cases, return the original output
		return message.send(codeBlock('prolog', [cutText(stdout, 1950) || Emojis.GreenTick, stderr || Emojis.GreenTick].join('\n-=-=-=-\n')));
	}

	private async stash(message: KlasaMessage) {
		await message.send('Unsuccessful pull, stashing...');
		await sleep(1000);
		const { stdout, stderr } = await this.exec(`git stash`);
		if (!this.isSuccessfulStash(stdout + stderr)) {
			throw `Unsuccessful pull, stashing:\n\n${codeBlock('prolog', [stdout || '✔', stderr || '✔'].join('\n-=-=-=-\n'))}`;
		}

		return message.send(codeBlock('prolog', [cutText(stdout, 1950) || '✔', stderr || '✔'].join('\n-=-=-=-\n')));
	}

	private async checkout(message: KlasaMessage, branch: string) {
		await message.send(`Switching to ${branch}...`);
		await this.exec(`git checkout ${branch}`);
		return message.send(`${Emojis.GreenTick} Switched to ${branch}.`);
	}

	private async isCurrentBranch(branch: string) {
		const { stdout } = await this.exec('git symbolic-ref --short HEAD');
		return stdout === `refs/heads/${branch}\n` || stdout === `${branch}\n`;
	}

	private isSuccessfulPull(output: string) {
		return /\d+\s*file\s*changed,\s*\d+\s*insertions?\([+-]\),\s*\d+\s*deletions?\([+-]\)/.test(output);
	}

	private isSuccessfulStash(output: string) {
		return output.includes('Saved working directory and index state WIP on');
	}

	private needsStash(output: string) {
		return output.includes('Your local changes to the following files would be overwritten by merge');
	}

	private async exec(script: string) {
		try {
			const result = await exec(script);
			return { ...result, code: 0 };
		} catch (error) {
			return { stdout: '', stderr: error?.message || error || '', code: error.code ?? 1 };
		}
	}

}
