<!-- # 简介 -->

!> `obsidian-booknote-plugin` 从 0.3.0 开始更名为 `obsidian-bookmaster-plugin`，主要原因是 `booknote` 与软件 `bookxnote` 容易混淆，同时也因为 0.3.0 对插件进行了重构，是与之前版本完全不兼容的重大更新。

本插件尝试在 [obsidian](https://obsidian.md/) 上实现书籍管理，致力于构建书籍与笔记的良好关系。`Book`在本插件里已经扩展为一个十分宽泛的概念，它可以是一个文档（pdf,epub,txt等格式），也可以是一张图片，一个视频（如电影或视频教程），一段音频（如音乐）或者一个网页（html）等，在后面的文档中也将使用`Book`指代这些类型的文件。
插件通过标注，回链，BookProject等使`Book`与笔记形成相互联系的整体，也希望能实现优雅的管理与统计分析功能。重要的是，本插件坚持完全本地及安全的原则，由用户自行管理所有文档，所有管理文件也为通用的纯文本文件。

<!--!> 但是目前主要侧重于文档管理，尤其是文献管理。 -->

本插件实现了简单的文件/文献**管理**功能。专业的文档管理软件很多，如zotero,calibra等，本插件无意取代任何软件，但是管理功能是建立好`Book`与笔记纽带的前提。本插件的书籍管理单位是**书库（BookVault）**，一个书库实际上就是一个文件夹。插件目前可以为书籍提供阅读状态/进度，标签，作者，摘要等简单的管理，同时对于论文，专利，图片等常见类型的书籍也提供了特殊的支持。对书籍的记录是通过`.md`文件中的 `yaml` 实现的，每一个`Book` 文件都对应一个唯一的`.md`文件，因此通过 [dataview](https://github.com/blacksmithgu/obsidian-dataview) 插件，可以实现对所有文件进行汇总及统计。需要注意的是，书籍不必是一个实际的文件，也可以是一个虚拟的记录（只有一个`.md`文件）。


`Book` 与笔记的联系是通过 **BookProject** 实现的。**Project** 实际上就是`Book`与笔记的组合（books+notes），一个 **Project** 里包含了若干的 `Book` 与若干笔记文件。一个 **BookProject** 可以是单个笔记文件，在`yaml`中通过 `bm-books` 指定与该笔记相关联的`Book`，也可以是一个文件夹，文件夹下的所有笔记都是 `Project`的笔记，此时则是在文件夹下的一个与文件夹同名的笔记文件里的`yaml`记录关联的 `Book`。

<!--实际上这并不是一个新概念，很多的笔记软件都有这个功能，如 MarginNote, LiqueText，甚至有些书籍管理软件也有此类功能，如zotero，bookxnote pro等。然而对个人来讲，markdown类型的笔记是首选，图、表、代码、公式几个元素都是刚需。有些书籍软件也提供简单的markdown笔记功能，但是往往差强人意，与专业笔记软件相去甚远。-->

<!-- TODO: 支持列表 -->

此外，插件提供了内置的**阅读器（BookViewer）**。插件只实现了有限的文件格式。内置阅读器还提供了必要的标注功能，理论上不提供编辑功能。更重要的是，内置阅读器无法与各种格式的专业阅读器相媲美，但是目前还没有找到使用专业阅读器提供回链的完美解决方案。