# 人口档案馆（Demography Archive）

**网站：[https://demoarchive.net](https://demoarchive.net)**

1963 年，中国每分钟出生 56 人，全年约 2975 万；2025 年，每分钟约 15 人，全年 792 万。2016\~2025 年，年出生人口从 1883 万降至 792 万，降幅 57.9%，为 1949 年以来最低。

产房的寂静，不会停留在产房。人口缩减沿着年龄阶梯逐级向上传导：先是奶粉、托育与幼儿园，然后是小学、中学、大学，再往后是就业、结婚、买房与养老。所有不具备海外市场的行业，规模减半只是时间问题，而且不需要等到下一代人。

「人口档案馆」用数据、地图与可视化记录这条下行曲线：既呈现全国与各省的出生人口、生育率和未来预测，也整理关于人口的常见争论、各方观点与思想实验。本站不评判任何个体的生育选择，只希望把“人口与未来”的关系说清楚。

## 网站内容

以下按网站顶部导航顺序排列。

| # | 栏目 | 内容 |
| --- | --- | --- |
| 1 | [正在来临的危险](https://demoarchive.net/harms/) | 人口缩减沿年龄阶梯向上传导：2016 年出生 1883 万，2025 年只剩 792 万；幼儿园、中学、高等教育、日常消费品、公务员与事业编、房地产、互联网依次承压，电力和医院可能是例外。 |
| 2 | [各省生育地图](https://demoarchive.net/map/) | 2016\~2025 年各省出生人口降幅排序，以及 1949\~2025 年分省出生人口与出生率地图；点击省份查看历年数据。 |
| 3 | [未来人口预测](https://demoarchive.net/forecast/) | 队列要素法推演 2026\~2100 年人口；高、中、低三情景总和生育率为 1.3、1.0、0.8，可查看总人口、出生、死亡与年减少人数。 |
| 4 | [各国生育率与生育支持](https://demoarchive.net/world/) | 1960\~2024 年世界各国（总和）生育率地图；2010\~2023 年 OECD 国家家庭福利公共支出占 GDP 比重排名与走势。 |
| 5 | [永恒的争论](https://demoarchive.net/debates/) | 逐条回应六种常见论点：人口过多论、收缩红利论、机器替代论、内卷降低论、少生优生论、补贴无用论。 |
| 6 | [各方观点](https://demoarchive.net/viewpoints/) | 普京、李光耀、马斯克、李显龙、梁建章、黄文政六人关于人口问题的公开表述，共 74 条，按时间倒序并附出处。 |
| 7 | [思想实验](https://demoarchive.net/thought-experiment/) | 三篇叙事型实验：《少子化的囚徒困境》《博士与母亲》《2060年的五百万》，分别讨论个体理性、代际账本与养老兑付。 |
| 8 | [数据中心](https://demoarchive.net/datacenter/) | 全国、各省、预测与国际比较共 8 组数据；在线交互查看，并可下载 xlsx，清单见下一节。 |
| 9 | [其他](https://demoarchive.net/other/) | 人口概念解释：总人口、出生人口、出生率、（总和）生育率、世代更替水平、老龄化与少子化、婴儿潮与回声潮；另含关于本站与联系方式。 |

## 数据中心可下载内容

全部文件位于仓库 `data/` 目录，也可在[数据中心](https://demoarchive.net/datacenter/)逐项下载。

| # | 数据组 | 文件 | 内容与说明 |
| --- | --- | --- | --- |
| 1 | [全国历年出生人口](https://demoarchive.net/datacenter/#secNat) | `nbs-national-data.xlsx`<br>`yuwa-births-backcast.xlsx` | 1949 年以来全国历年出生人口、出生率、年末总人口；国家统计局与育娲人口智库两套口径并列，便于对照。 |
| 2 | [七普回溯出生人口](https://demoarchive.net/datacenter/#secCensus) | `population-census-2020.xlsx` | 依据 2020 年第七次全国人口普查分年龄人口，回溯“当年出生、2020 年仍健在”的人数。 |
| 3 | [各年代年均出生人口](https://demoarchive.net/datacenter/#secDec) | `avg-births-by-decade.xlsx` | 上世纪 50 年代以来各年代出生人口年均值；2025 年为当年出生人口。 |
| 4 | [未来人口预测](https://demoarchive.net/datacenter/#secFc) | `forecast-all.xlsx`<br>`forecast-population.xlsx`<br>`forecast-births.xlsx`<br>`forecast-deaths.xlsx`<br>`forecast-decrease.xlsx` | 2026\~2100 年高、中、低三情景（总和生育率 1.3 / 1.0 / 0.8）；`forecast-all` 为完整数据，其余四份分别为总人口、出生人口、死亡人口、年减少人数，单位万人。 |
| 5 | [各省历年出生数据](https://demoarchive.net/datacenter/#secProv) | `provinces/*.xlsx`（34 份） | 34 个省级行政区各一份，1949 年以来历年出生数据；按地区分组见下表。 |
| 6 | [各省出生人口下降幅度](https://demoarchive.net/datacenter/#secDecline) | `provincial-births-decline-2016-2025.xlsx` | 各省 2016 与 2025 年出生人口及降幅（%）；降幅 =（2025 年 − 2016 年）÷ 2016 年。 |
| 7 | [各国生育率](https://demoarchive.net/datacenter/#secWorld) | `wdi-tfr-by-country.xlsx` | 世界银行 WDI，1960\~2024 年各国（总和）生育率。 |
| 8 | [各国生育补贴支出](https://demoarchive.net/datacenter/#secSupport) | `public-family-spending-by-type-gdp-pct.xlsx` | OECD SOCX，2010\~2023 年各国家庭公共支出（现金及实物）占 GDP 比重。 |

### 各省数据文件

省级文件按拼音命名，不含“省 / 市 / 自治区”后缀，全部位于 `data/provinces/`。

| 地区 | 文件 |
| --- | --- |
| 华北 | `beijing.xlsx`、`tianjin.xlsx`、`hebei.xlsx`、`shanxi.xlsx`、`neimenggu.xlsx` |
| 东北 | `liaoning.xlsx`、`jilin.xlsx`、`heilongjiang.xlsx` |
| 华东 | `shanghai.xlsx`、`jiangsu.xlsx`、`zhejiang.xlsx`、`anhui.xlsx`、`fujian.xlsx`、`jiangxi.xlsx`、`shandong.xlsx`、`taiwan.xlsx` |
| 华中 | `henan.xlsx`、`hubei.xlsx`、`hunan.xlsx` |
| 华南 | `guangdong.xlsx`、`guangxi.xlsx`、`hainan.xlsx`、`xianggang.xlsx`、`aomen.xlsx` |
| 西南 | `chongqing.xlsx`、`sichuan.xlsx`、`guizhou.xlsx`、`yunnan.xlsx`、`xizang.xlsx` |
| 西北 | `shaanxi.xlsx`、`gansu.xlsx`、`qinghai.xlsx`、`ningxia.xlsx`、`xinjiang.xlsx` |

## 数据来源

- **国家统计局**：全国历年出生人口、出生率、年末总人口；年度人口抽样调查，以及 1982、1990、2000、2010、2020 年历次人口普查。主要取自国家统计局[“国家数据”](https://data.stats.gov.cn/)。
- **各省、自治区、直辖市统计局**：各省历年出生人口、出生率、常住人口，来源为各省统计年鉴、国民经济和社会发展统计公报及省级统计部门公开发布的数据。各省口径、修订情况与缺失年份见对应省份数据表下方注释。
- **育娲人口智库**：出生人口回溯数据与研究成果，主要依据[《中国百年历史人口报告》](https://file.c-ctrip.com/files/6/yuwa/0R72e12000ty0rddz037D.pdf)。
- **马克数据网**：部分统计年鉴文件，用于补充和交叉核对，见 [macrodatas.cn](https://www.macrodatas.cn/)。
- **世界银行 World Development Indicators**：1960\~2024 年各国（总和）生育率，指标代码 `SP.DYN.TFRT.IN`，见 [WDI](https://data.worldbank.org/indicator/SP.DYN.TFRT.IN)。
- **经济合作与发展组织（OECD）**：2010\~2023 年各国家庭公共支出（现金及实物）占 GDP 比重，取自 OECD Social Expenditure Database（SOCX），经 [OECD Data Explorer](https://data-explorer.oecd.org/) 导出。
- **联合国《世界人口展望 2024》**：人口预测所用的中国年龄别生育率与生命表，见 [UN WPP 2024](https://population.un.org/wpp/)。

## 许可

- **代码**：MIT，见 [LICENSE](LICENSE)。
- **文字、图表与页面设计**：© 2026 人口档案馆，未经许可请勿转载。
- **第三方数据**：版权归国家统计局、各省统计局、育娲人口智库、世界银行、OECD、联合国等原始来源所有，使用请遵循各来源条款。
- **第三方库**：ECharts（Apache-2.0）；地图边界数据来自 DataV / 高德，遵循原服务条款。

## 反馈

欢迎通过 [Issues](https://github.com/DemoArchive/demography-archive/issues) 指出数据、文字或代码问题。
