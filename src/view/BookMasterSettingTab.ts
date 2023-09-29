import { App, ButtonComponent, Notice, Platform, PluginSettingTab, Setting, TextComponent } from "obsidian";
import { DocumentViewerTheme } from "../document_viewer/documentViewer";
import BookMasterPlugin from "src/main";
import * as utils from '../utils'


export class BookMasterSettingTab extends PluginSettingTab {
    plugin: BookMasterPlugin;

    constructor(app: App, plugin: BookMasterPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }


    private addBookVaultSetting(vid: string, newVault: boolean = false) {

        const deviceSetting = this.plugin.getCurrentDeviceSetting();
        const commonSetting = this.plugin.settings;

        const vaultName = newVault ? `BookVault-${vid}` : commonSetting.bookVaultNames[vid];
        const vaultPath = newVault ? `@` : deviceSetting.bookVaultPaths[vid];


        const bookVaultSetting = new Setting(this.containerEl);

        var compPath: TextComponent = null;
        var compName: TextComponent = null;
        var btnPickFolder: ButtonComponent = null;
        var btnToggleEdit: ButtonComponent = null;
        var changed = false;

        bookVaultSetting
            .setName("vid:" + vid)
            .addSearch((text) => {
                compName = text;
                text.setValue(vaultName).onChange(async (value) => {
                    changed = true;
                })
            })
            .addSearch((text) => {
                compPath = text;
                text.setValue(vaultPath).onChange(async (value) => {
                    changed = true;
                })
            })

        bookVaultSetting.addButton((btn) => {
            btnToggleEdit = btn;

            btn.onClick(async () => {
                if (compPath.disabled) {
                    btn.setIcon("check");
                    compName.setDisabled(false);
                    compPath.setDisabled(false);
                    btnPickFolder.setDisabled(false);
                } else {
                    compName.setDisabled(true);
                    compPath.setDisabled(true);
                    btnPickFolder.setDisabled(true);
                    btn.setIcon("pencil");

                    if (changed) {
                        changed = false;
                        this.plugin.bookVaultManager.modifyBookVault(vid, compName.getValue(), compPath.getValue()).then(() => {
                            new Notice("设置完成");
                        })
                    }
                }
            })
        })
        if (Platform.isDesktop) {
            bookVaultSetting.addButton((btn) => {
                btnPickFolder = btn;
                btn.setDisabled(true);
                btn.setIcon("folder");
                btn.onClick(() => {
                    btn.setDisabled(true);
                    utils.pickFolder().then((path) => {
                        btn.setDisabled(false);

                        var newName = null;
                        if (path.lastIndexOf("/") !== -1) {
                            newName = path.substring(path.lastIndexOf("/") + 1);
                        } else if (path.lastIndexOf("\\") !== -1) {
                            newName = path.substring(path.lastIndexOf("\\") + 1);
                        }
                        // console.log(newName);
                        compName.setValue(newName);
                        compPath.setValue(path);
                        if (path !== deviceSetting.bookVaultPaths[vid] || newName !== commonSetting.bookVaultNames[vid]) {
                            changed = true;
                        }
                    }).catch(() => {
                        btn.setDisabled(false);
                    })
                })
            })
        }
        bookVaultSetting.addButton((btn) => {
            btn.setIcon("cross");
            btn.onClick(async () => {
                this.plugin.bookVaultManager.removeBookVault(vid);
                bookVaultSetting.settingEl.remove();
            })
        })


        if (newVault) {
            compName.setDisabled(false);
            compPath.setDisabled(false);
            btnPickFolder.setDisabled(false);
            btnToggleEdit.setIcon("check");
        } else {
            compName.setDisabled(true);
            compPath.setDisabled(true);
            btnPickFolder.setDisabled(true);
            btnToggleEdit.setIcon("pencil");
        }
    }


    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h2", { text: "BookMaster" });
        const deviceSetting = this.plugin.getCurrentDeviceSetting();
        const commonSetting = this.plugin.settings;



        new Setting(containerEl)
            .setName("当前设备名")
            .setDesc("当前设备id:" + utils.appId)
            .addText((text) => {
                text.setValue(deviceSetting.deviceName).onChange(async (value) => {
                    deviceSetting.deviceName = value;
                    await this.plugin.saveSettings();
                });
            });
        new Setting(containerEl)
            .setName("BookViewer服务器地址")
            .setDesc("默认服务器仅供测试，随时下线，请及时部署本地服务器")
            .addText((text) => {
                text.inputEl.style.width = "300px";
                text.setValue(deviceSetting.bookViewerWorkerPath).onChange(async (value) => {
                    deviceSetting.bookViewerWorkerPath = value;
                    await this.plugin.saveSettings();
                })
            });

        new Setting(containerEl)
            .setName("数据文件夹路径")
            .setDesc("ob库内的文件夹路径，如 `/resources/bookmaster`，保存所有元信息和标注信息等")
            .addText((text) => {
                text.inputEl.style.width = "300px";
                text.setValue(commonSetting.dataPath).onChange(async (value) => {
                    commonSetting.dataPath = value;
                    await this.plugin.saveSettings();
                })
            }
            );


        new Setting(containerEl)
            .setName("BookExplorer显示文件格式")
            .setDesc("需要在BookExplorer显示的文件格式")
            .addText((text) => {
                text.inputEl.style.width = "300px";
                text
                    .setPlaceholder("pdf,ppt,jpg")
                    .setValue(commonSetting.showBookExts.toString()).onChange(async (value) => {
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
                    .setValue(commonSetting.openBookExtsWithDefaultApp.toString()).onChange(async (value) => {
                        commonSetting.openBookExtsWithDefaultApp = value.split(",");
                        await this.plugin.saveSettings();
                    })
            });

        // TODO: hide setting
        if (commonSetting.openAllBookWithDefaultApp) {
            bookextsSetting.settingEl.style.display = "none";
        }

        toggleOpenAllBook.addToggle((toggle) => {
            toggle.setValue(commonSetting.openAllBookWithDefaultApp).onChange(async (value) => {
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
        .setName("用户名")
        .setDesc("用于设置标注时的用户名")
        .addText((text) => {
            text.setValue(commonSetting.annotationAuthor).onChange(async (value) => {
                commonSetting.annotationAuthor = value;
                await this.plugin.saveSettings();
            })
        });


        new Setting(containerEl)
            .setName("PDF截图比例")
            .setDesc("设为0则使用阅读时的放大比例")
            .addSlider((slider) =>
                slider
                    .setLimits(0, 8, 1)
                    .setDynamicTooltip()
                    .setValue(commonSetting.fixedAnnotationImageScale).onChange(async (value) => {
                        commonSetting.fixedAnnotationImageScale = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("PDF选文标注模板")
            .addTextArea((text) => {
                text.inputEl.style.width = "408px";
                text.inputEl.style.height = "82px";
                text.setValue(commonSetting.annotationTemplate.pdf.textAnnotation).onChange(async (value) => {
                    commonSetting.annotationTemplate.pdf.textAnnotation = value;
                    await this.plugin.saveSettings();
                });
            });


        new Setting(containerEl)
            .setName("PDF区域标注模板")
            .addTextArea((text) => {
                text.inputEl.style.width = "408px";
                text.inputEl.style.height = "82px";
                text.setValue(commonSetting.annotationTemplate.pdf.regionAnnotation).onChange(async (value) => {
                    commonSetting.annotationTemplate.pdf.regionAnnotation = value;
                    await this.plugin.saveSettings();
                });
            });


        new Setting(containerEl)
            .setName("阅读器主题")
            .setDesc("背景色需要重新打开阅读器生效")
            .addDropdown((dp) => {
                dp.addOption(DocumentViewerTheme.Dark, "深色");
                dp.addOption(DocumentViewerTheme.DarkYellow, "深色(羊皮纸)");
                dp.addOption(DocumentViewerTheme.DarkGreen, "深色(护眼绿)");
                dp.addOption(DocumentViewerTheme.Light, "浅色");
                dp.addOption(DocumentViewerTheme.LightYellow, "浅色(羊皮纸)");
                dp.addOption(DocumentViewerTheme.LightGreen, "浅色(护眼绿)");

                dp.setValue(commonSetting.documentViewerTheme);

                dp.onChange(async (value) => {
                    commonSetting.documentViewerTheme = value as DocumentViewerTheme;
                    // this.plugin.setDocumentViewerTheme(commonSetting.documentViewerTheme);
                    await this.plugin.saveSettings();

                })
            })



        // BookVault
        new Setting(containerEl)
            .setHeading()
            .setName("书库设置")
            .addButton((button) => {
                button
                    .setButtonText("+")
                    .setTooltip("添加书库")
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

                        this.addBookVaultSetting(vid, true);



                    })
            });
        for (var vid in commonSetting.bookVaultNames) {
            this.addBookVaultSetting(vid);
        }
    }
}