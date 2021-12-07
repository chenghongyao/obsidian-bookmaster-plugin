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

