import { SettingsMgr } from "./SettingsMgr.js";
const Settings = new SettingsMgr();

const STATE_READY = 0;
const STATE_WAIT = 1;
const STATE_PLAY = 2;
const STATE_COOLDOWN = 3;
class NotificationsSoundPlayer {
	#state;
	#waitTimer;
	#waitDelay;
	#cooldownDelay;
	#notificationType;

	constructor() {
		this.#state = STATE_READY;
		this.#waitDelay = 100;
		this.#notificationType = -1; //-1 = no sound to play
		this.#loadSettings();
	}
	async #loadSettings() {
		while (!Settings.isLoaded()) {
			await new Promise((r) => setTimeout(r, 10));
		}
		this.#cooldownDelay = Settings.get("notification.soundCooldownDelay");
	}

	play(notificationType) {
		//Save the highest notification type
		this.#setHighestNotificationType(notificationType);

		//Play logic
		if (this.#state !== STATE_COOLDOWN) {
			this.#setState(STATE_WAIT);
			clearTimeout(this.#waitTimer);
			this.#waitTimer = setTimeout(() => {
				this.#playSound();
			}, this.#waitDelay);
		}
	}

	#setState(stateType) {
		this.#state = stateType;
		//console.log("State: " + this.#state);
	}
	#setHighestNotificationType(notificationType) {
		if (notificationType >= this.#notificationType) {
			this.#notificationType = notificationType;
		}
	}

	#playSound() {
		this.#setState(STATE_PLAY);

		let data = this.#getSoundAccordingToNotificationType();
		if (data == null) {
			throw new Error("Play was called with notification type of -1");
		}
		let filename = data.filename;
		let volume = data.volume;

		const audioElement = new Audio(chrome.runtime.getURL("resource/sound/" + filename + ".mp3"));
		const handleEnded = () => {
			audioElement.removeEventListener("ended", handleEnded); // Remove the event listener
			audioElement.remove(); // Remove the audio element from the DOM
		};
		audioElement.addEventListener("ended", handleEnded);
		if (volume >= 0 && volume <= 1) {
			audioElement.volume = Number(volume);
		}
		audioElement.play();

		//Set the cooldown
		this.#notificationType = -1;
		this.#setState(STATE_COOLDOWN);
		setTimeout(() => {
			if (this.#notificationType > -1) {
				this.#playSound();
			} else {
				this.#setState(STATE_READY);
			}
			this.#notificationType = -1;
		}, this.#cooldownDelay);
	}

	#getSoundAccordingToNotificationType() {
		switch (this.#notificationType) {
			case 0:
				return {
					volume: Settings.get("notification.monitor.regular.volume"),
					filename: Settings.get("notification.monitor.regular.sound"),
				};
			case 1:
				return {
					volume: Settings.get("notification.monitor.zeroETV.volume"),
					filename: Settings.get("notification.monitor.zeroETV.sound"),
				};
			case 2:
				return {
					volume: Settings.get("notification.monitor.highlight.volume"),
					filename: Settings.get("notification.monitor.highlight.sound"),
				};
		}
		return null;
	}
}

export { NotificationsSoundPlayer };
