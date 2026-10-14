export const NATIVE_BUILD_CONFIGURATION = "Release";

// A per-configuration output directory is not extended by multi-config generators.
export function nativeCmakeArguments(source, directory, target) {
  return {
    configure: ["-S", source, "-B", directory, `-DCMAKE_BUILD_TYPE=${NATIVE_BUILD_CONFIGURATION}`,
      `-DCMAKE_RUNTIME_OUTPUT_DIRECTORY_${NATIVE_BUILD_CONFIGURATION.toUpperCase()}=${directory}`,
      "-DFETCHCONTENT_FULLY_DISCONNECTED=ON", "-DCMAKE_POLICY_VERSION_MINIMUM=3.10"],
    build: ["--build", directory, "--target", target, "--config", NATIVE_BUILD_CONFIGURATION, "--parallel", "2"],
  };
}
