## v0.2.2(20211211)

### 新增功能
- 【重要/beta】多书库支持，兼容之前的书库设置，称之前的为**主书库**，可以在设置中添加书库，书库中的书籍文件路径用`@<库名>/<路径>`表示，数据文件存放在`extra-books-data/<库名>`中，主书库文件路径与数据文件与之前的兼容；

- 【重要/beta】增加zotero导入功能，在设置中一键导入，需要在zotero中选择Better BibTex的导出方式，只能导入附件文件在当前书库中的条目；

- 【BookExplorer】增加书籍文件的显示方式(按标签，作者，发表年份)和顺序(升序，降序)；

- 【BookExplorer】增加搜索功能,可以通过BookExplorer导航栏的搜索按钮，或者使用命令`Search Book`；
- 【BookExplorer】当为书籍文件设置了**标题**时，显示其标题而不是文件名（解决zotero的附件命名不全的问题）；

- 【BookProject】添加命令`Open Book Of Project`用于快速打开工程的第一本书；

- 【BookView】在`更多`菜单中添加复制当前页回链的选项，可在设置中设置回链模板；

- 【BookView】在`更多`菜单中添加关闭其他阅读器和关闭所有阅读器的功能；

- 【设置】增加主书库命名设置项；

### bug修复

- 修复回链模板的page没有生效；

- 支持选文标注的第一个comment；

- 修复默认的框选模板的问题；

- 修复截图保存路径的bug，更新后以前生成的截图无法双击跳转了；

- 修复文档打开情况下双击图片切换文档后无法跳转问题；

## v0.2.0 (20211207)
- (重要)现在可以设置booknote的配置文件根目录了，必须是库内路径，默认是booknote；

- (重要)[BookView]添加了文字和图片两种类型的摘录回链，可自定义模板，增加图片摘录的**双击**打开原文功能，可自定义截图比例，看b站演示视频；

- [BookView]选文摘录去除的所有错误换行，现在多行也会被合并为一行；

- [BookView]添加自动复制的设置项，每次添加标注时可自动复制到剪贴板；

- [BookView]标题栏添加小飞机按钮，可以开启快速摘录模式，每次**添加标注**都自动发送到md文件中（需要先激活md文件）,或者点击**复制回链**也可以自动插入；


- [BookView]阅读器增加多窗口支持，在BookExplorer,BookProject,或者标注图片上都可以使用`Ctrl+点击`打开新的阅读器；

- [BookView]打开阅读器时固定页面避免被覆盖关闭；

- [BookProject]支持url类型，支持url命名，使用`[名称](url)`添加一个url类型的book，必须加上双引号；

- [BookExplorer]添加了一个侧边栏RibbonIcon；

- [协议]现有协议类型包括`annotations`,`open-book`,`update-book-explorer`:
```text
obsidian://booknote?type=annotations&book=<bookpath>&id=<annotationId>
obsidian://booknote?type=open-book&book=<bookpath>page=<page number>
obsidian://booknote?type=update-book-explorer
```

