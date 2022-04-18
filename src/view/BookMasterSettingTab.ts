import { App, PluginSettingTab, Setting } from "obsidian";
import BookMasterPlugin from "src/main";

export class BookMasterSettingTab extends PluginSettingTab {
	plugin: BookMasterPlugin;

	constructor(app: App, plugin: BookMasterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}


	
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "BookMaster" });
        const deviceSetting = this.plugin.getCurrentDeviceSetting();
        const commonSetting = this.plugin.settings;

        new Setting(containerEl)
        .setName("主书库名")
        .setDesc("主书库名,为空着使用书库文件夹名")
        .addText((text) =>
            text.setValue(commonSetting.bookVaultNames["00"]).onChange(async (value) => {
                commonSetting.bookVaultNames["00"] = value;
                await this.plugin.saveSettings();
            })
        );

        new Setting(containerEl)
        .setName("主书库路径")
        .setDesc("必须使用绝对路径(可用@表示ob库地路径)")
        .addText((text) =>
            text.setValue(deviceSetting.bookVaultPaths["00"]).onChange(async (value) => {
                deviceSetting.bookVaultPaths["00"] = value;
                await this.plugin.saveSettings();
            })
        );


        new Setting(containerEl)
            .setName("WebViewer库路径")
            .setDesc("如http(s)://<ip>:<port>/webviewer")
            .addText((text) =>
                text.setValue(deviceSetting.bookViewerWorkerPath).onChange(async (value) => {
                    deviceSetting.bookViewerWorkerPath = value;
                    await this.plugin.saveSettings();
                })
            );

    }
}