import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import BookMasterPlugin from "src/main";
import * as utils from '../utils'


export class BookMasterSettingTab extends PluginSettingTab {
	plugin: BookMasterPlugin;

	constructor(app: App, plugin: BookMasterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}


    private addBookVaultSetting(vid: string) {
    
        const deviceSetting = this.plugin.getCurrentDeviceSetting();
        const commonSetting = this.plugin.settings;
    
        const bookVaultSetting = new Setting(this.containerEl);
        bookVaultSetting
        .setName("vid:"+vid)
        .addSearch((text) => {
            text.setValue( commonSetting.bookVaultNames[vid]).onChange(async (value) => {
                commonSetting.bookVaultNames[vid] = value;
                await this.plugin.saveSettings();
            })
        })
        .addSearch((text) => {
            text.setValue(deviceSetting.bookVaultPaths[vid]).onChange(async (value) => {
                deviceSetting.bookVaultPaths[vid] = value;
                await this.plugin.saveSettings();
            })
        })
        .addExtraButton((btn) => {
            btn.setIcon("cross");
            btn.onClick(async () => {

                this.plugin.removeBookVault(vid);
                bookVaultSetting.settingEl.remove();
            })
        }) 
    }
	
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "BookMaster" });
        const deviceSetting = this.plugin.getCurrentDeviceSetting();
        const commonSetting = this.plugin.settings;



        new Setting(containerEl)
        .setName("当前设备名")
        .setDesc("当前设备id:"+utils.appId)
        .addText((text) => {
            text.setValue(deviceSetting.deviceName).onChange(async (value) => {
                deviceSetting.deviceName = value;
                await this.plugin.saveSettings();
            });
        });
        new Setting(containerEl)
            .setName("BookViewer库路径")
            .setDesc("默认服务器仅供测试，随时下线，请及时部署本地服务器")
            .addText((text) =>
                text.setValue(deviceSetting.bookViewerWorkerPath).onChange(async (value) => {
                    deviceSetting.bookViewerWorkerPath = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
        .setName("数据文件夹路径")
        .setDesc("ob库内的文件夹路径，保存所有元信息和标注信息")
        .addText((text) =>
            text.setValue(commonSetting.dataPath).onChange(async (value) => {
                commonSetting.dataPath = value;
                await this.plugin.saveSettings();
            })
        );


        // new Setting(containerEl)
        // .setName("主书库名")
        // .setDesc("主书库名,为空着使用书库文件夹名")
        // .addText((text) =>
        //     text.setValue(commonSetting.bookVaultNames["00"]).onChange(async (value) => {
        //         commonSetting.bookVaultNames["00"] = value;
        //         await this.plugin.saveSettings();
        //     })
        // );

        // new Setting(containerEl)
        // .setName("主书库路径")
        // .setDesc("必须使用绝对路径(可用@表示ob库地路径)")
        // .addText((text) =>
        //     text.setValue(deviceSetting.bookVaultPaths["00"]).onChange(async (value) => {
        //         deviceSetting.bookVaultPaths["00"] = value;
        //         await this.plugin.saveSettings();
        //     })
        // );


        

        new Setting(containerEl)
        .setName("显示的文件格式")
        .setDesc("需要在BookExplorer显示的文件格式")
        .addText((text) => {
            text
            .setPlaceholder("pdf,ppt,jpg")
            .setValue(commonSetting.showBookExts.toString()).onChange(async (value)=> {
                commonSetting.showBookExts = value.split(",");
                await this.plugin.saveSettings();
            })
        });

        const toggleOpenAllBook = new Setting(containerEl).setName("使用默认应用打开所有文件");

   
        const bookextsSetting = new Setting(containerEl)
        .setName("使用默认应用打开的文件后缀")
        .setDesc("以逗号分隔")
        .addText((text) => {
            text
            .setPlaceholder("pdf,ppt,jpg")
            .setValue(commonSetting.openBookExtsWithDefaultApp.toString()).onChange(async (value)=> {
                commonSetting.openBookExtsWithDefaultApp = value.split(",");
                await this.plugin.saveSettings();
            })
        });

        // TODO: hide setting
        if (commonSetting.openAllBookWithDefaultApp) {
            bookextsSetting.settingEl.style.display  = "none";
        }

        toggleOpenAllBook.addToggle((toggle) => {
            toggle.setValue(commonSetting.openAllBookWithDefaultApp).onChange(async (value)=> {
                commonSetting.openAllBookWithDefaultApp = value;
                if (commonSetting.openAllBookWithDefaultApp) {
                    bookextsSetting.settingEl.style.display = "none";
                } else {
                    bookextsSetting.settingEl.style.display = "flex";
                }
                await this.plugin.saveSettings();
            })
        });


        
        new Setting(containerEl)
        .setName("PDF截图比例")
        .setDesc("设为0则使用阅读时的放大比例")
        .addSlider((slider) =>
        slider
        .setLimits(0,8,1)
        .setDynamicTooltip()
        .setValue(commonSetting.fixedAnnotationImageScale).onChange(async (value) => {
                commonSetting.fixedAnnotationImageScale = value;
                await this.plugin.saveSettings();
            })
        );
        
        new Setting(containerEl)
        .setName("PDF选文标注模板")
        .addTextArea((text) => {
            text.setValue(commonSetting.annotationTemplate.pdf.textAnnotation).onChange(async (value) => {
                commonSetting.annotationTemplate.pdf.textAnnotation = value;
                await this.plugin.saveSettings();
            });
        });
        

        new Setting(containerEl)
        .setName("PDF区域标注模板")
        .addTextArea((text) => {
            text.setValue(commonSetting.annotationTemplate.pdf.regionAnnotation).onChange(async (value) => {
                commonSetting.annotationTemplate.pdf.regionAnnotation = value;
                await this.plugin.saveSettings();
            });
        });


        new Setting(containerEl)
            .setHeading()
            .setName("添加书库")
            .addButton((button) => {
                button
                .setButtonText("+")
                .onClick(async () => {
                    var vid: string = null;
                    for (var v = 0; v < 99; v++) {
                        vid = v < 10 ? ('0' + v.toString()) : v.toString();
                        if (commonSetting.bookVaultNames[vid] == undefined) {
                            break
                        }
                    }

                    if (!vid) {
                        new Notice("无法添加更多书库")
                        return;
                    }


                    commonSetting.bookVaultNames[vid] = "我的书库";
                    deviceSetting.bookVaultPaths[vid] = "@";
                    await this.plugin.saveSettings();
                    this.addBookVaultSetting(vid);



                })
            });
        

        for (var vid in commonSetting.bookVaultNames) {
            this.addBookVaultSetting(vid);
        }

        



    }
}