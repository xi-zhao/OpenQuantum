export const MCP_CREDENTIAL_CATALOG = Object.freeze({
  AQT_API_TOKEN: Object.freeze({
    displayName: "AQT Arnica Token",
    description: "AQT Arnica 访问令牌；用户自行配置，仅用于显式设备查询。",
    documentationUrl: "https://qiskit-community.github.io/qiskit-aqt-provider/",
  }),
  OQC_API_TOKEN: Object.freeze({
    displayName: "OQC API Token",
    description: "OQC 服务访问令牌；用户自行配置，云任务提交可能产生费用。",
    documentationUrl: "https://docs.oqc.app/account_management.html",
  }),
  OQC_API_ENDPOINT: Object.freeze({
    displayName: "OQC 服务地址",
    description: "可选官方 oqc.app HTTPS 服务地址；默认 https://cloud.oqc.app。",
    documentationUrl: "https://docs.oqc.app/",
  }),
  QUANTUMINSPIRE_API_TOKEN: Object.freeze({
    displayName: "Quantum Inspire Access Token",
    description: "Quantum Inspire OAuth access token；用户自行更新过期令牌，不读取本机 CLI 账户文件。",
    documentationUrl: "https://github.com/QuTech-Delft/quantuminspire",
  }),
  CLASSIQ_XCH_TOKEN: Object.freeze({
    displayName: "Classiq Exchange Token",
    description: "用户创建的 Classiq SDK Exchange Token；仅远程电路综合需要，本地模型准备无需凭据。",
    documentationUrl: "https://docs.classiq.io/",
  }),
  QCTRL_API_KEY: Object.freeze({
    displayName: "Q-CTRL API Key",
    description: "用于查询已有 Q-CTRL 作业的状态；本地控制模型准备无需凭据。",
    documentationUrl: "https://docs.q-ctrl.com/boulder-opal/toolkit/discover/set-up/how-to-authenticate-using-an-api-key",
  }),
  QCPORTAL_ADDRESS: Object.freeze({
    displayName: "QCArchive 服务器地址",
    description: "用户指定的 QCArchive 服务器 HTTPS 地址；公开服务可匿名，私有服务另填用户名与密码。",
    documentationUrl: "https://docs.qcarchive.molssi.org/user_guide/client_setup.html",
  }),
  QCPORTAL_USERNAME: Object.freeze({
    displayName: "QCArchive 用户名",
    description: "QCArchive 私有服务用户名；需与密码一起配置，仅在显式查询时用于登录。",
    documentationUrl: "https://docs.qcarchive.molssi.org/user_guide/client_setup.html",
  }),
  QCPORTAL_PASSWORD: Object.freeze({
    displayName: "QCArchive 密码",
    description: "QCArchive 私有服务密码；仅保存在 Harness 凭据库，不进入查询参数或结果。",
    documentationUrl: "https://docs.qcarchive.molssi.org/user_guide/client_setup.html",
  }),
  PASQAL_AUTH_TOKEN: Object.freeze({
    displayName: "Pasqal Access Token",
    description: "Pasqal SDK 访问令牌；通过 SDK 环境配置，当前不读取本页凭据库。",
    documentationUrl: "https://docs.pasqal.com/cloud/",
  }),
  PASQAL_USERNAME: Object.freeze({
    displayName: "Pasqal 用户名",
    description: "Pasqal SDK 密码登录的用户名；与密码一起在 SDK 环境中配置。",
    documentationUrl: "https://docs.pasqal.com/cloud/",
  }),
  PASQAL_PASSWORD: Object.freeze({
    displayName: "Pasqal 密码",
    description: "Pasqal SDK 密码登录的密码；与用户名一起在 SDK 环境中配置。",
    documentationUrl: "https://docs.pasqal.com/cloud/",
  }),
  SUPERSTAQ_API_KEY: Object.freeze({
    displayName: "Superstaq API Key",
    description: "用于 Infleqtion 目标查询与远程电路编译；编译会外发电路，不执行 QPU 作业。密钥只保存在 Harness 凭据库。",
    documentationUrl: "https://superstaq.readthedocs.io/en/latest/",
  }),
  QPANDA3_API_KEY: Object.freeze({
    displayName: "本源量子 API Key",
    description:
      "供 QPanda3 Runtime MCP 连接本源量子云并向悟空 QPU 提交真机任务；与 FieldQKit 只读发现用的 ORIGIN_API_TOKEN 相互独立，密钥只保存在 Harness 凭据库。",
    documentationUrl: "https://qcloud.originqc.com.cn/",
  }),
  QISKIT_IBM_TOKEN: Object.freeze({
    displayName: "IBM Quantum API Token",
    description:
      "供 IBM Runtime、IBM Transpiler 与可选硬件 MCP 共用；密钥只保存在 Harness 凭据库。",
    documentationUrl: "https://quantum.ibm.com/account",
  }),
  IONQ_API_KEY: Object.freeze({
    displayName: "IonQ API Key",
    description: "可选；允许 Quantum Hardware MCP 查询 IonQ 并提交模拟器或真实硬件任务。",
    documentationUrl: "https://cloud.ionq.com/",
  }),
  QUAFU_API_TOKEN: Object.freeze({
    displayName: "夸父量子云 Token",
    description: "供 FieldQKit 只读发现夸父量子云硬件；后续真实任务仍需单独审批。",
    documentationUrl: "https://quafu-sqc.baqis.ac.cn/",
  }),
  TIANYAN_API_TOKEN: Object.freeze({
    displayName: "天衍量子云 Token",
    description: "供 FieldQKit 只读发现天衍量子云硬件；后续真实任务仍需单独审批。",
    documentationUrl: "https://qc.zdxlz.com/",
  }),
  GUODUN_API_TOKEN: Object.freeze({
    displayName: "国盾量子云 Token",
    description: "供 FieldQKit 只读发现国盾量子云硬件；后续真实任务仍需单独审批。",
    documentationUrl: "https://quantumctek-cloud.com/",
  }),
  TENCENT_API_TOKEN: Object.freeze({
    displayName: "腾讯量子云 Token",
    description: "供 FieldQKit 只读发现腾讯量子云硬件；后续真实任务仍需单独审批。",
    documentationUrl: "https://quantum.tencent.com/cloud/",
  }),
  ORIGIN_API_TOKEN: Object.freeze({
    displayName: "本源量子云 Token",
    description: "供 FieldQKit 只读发现本源量子云硬件；部分操作还需要 pyqpanda3。",
    documentationUrl: "https://qcloud.originqc.com.cn/",
  }),
  FIELDQUANTUM_API_TOKEN: Object.freeze({
    displayName: "FieldQuantum API Token",
    description: "供 FieldQKit 访问 FieldQuantum 云端模拟器。",
    documentationUrl: "https://fieldquantum.tech/",
  }),
  LOGICALQUBIT_API_TOKEN: Object.freeze({
    displayName: "逻辑比特量子云 Token",
    description: "供 FieldQKit 只读发现逻辑比特量子云硬件；后续真实任务仍需单独审批。",
    documentationUrl: "https://cloud.logicalqubit.com/",
  }),
});
