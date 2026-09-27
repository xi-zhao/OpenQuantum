import { DIFFERENTIABLE_TOOLS } from "./sdk-differentiable.mjs";
import { SDK_COMPILER_TOOLS } from "./sdk-compilers.mjs";
import { SDK_DEVICE_TOOLS } from "./sdk-devices.mjs";
import { SDK_CLOUD_TOOLS } from "./sdk-cloud.mjs";

export const VENDOR_SDK_TOOLS = [...DIFFERENTIABLE_TOOLS, ...SDK_COMPILER_TOOLS, ...SDK_DEVICE_TOOLS, ...SDK_CLOUD_TOOLS];
