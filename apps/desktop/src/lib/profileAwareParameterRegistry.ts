import type {
  RawParamKnownStatus,
  RawParamProfileModel,
} from "./universalRawParamStore";

export type ProfileAwareParamDescriptor = {
  paramId: number;
  knownStatus?: Exclude<RawParamKnownStatus, "unknown">;
  decodedEntity?: string;
  decodedProperty?: string;
};

export type ParamClassification = {
  knownStatus: RawParamKnownStatus;
  decodedEntity?: string;
  decodedProperty?: string;
};

export class ProfileAwareParameterRegistry {
  private descriptorsByProfile = new Map<RawParamProfileModel, Map<number, ProfileAwareParamDescriptor>>();

  registerProfileDescriptors(
    profile: RawParamProfileModel,
    descriptors: ProfileAwareParamDescriptor[]
  ) {
    const profileMap = this.descriptorsByProfile.get(profile) ?? new Map<number, ProfileAwareParamDescriptor>();

    descriptors.forEach((descriptor) => {
      profileMap.set(descriptor.paramId, descriptor);
    });

    this.descriptorsByProfile.set(profile, profileMap);
  }

  classifyParam(paramId: number, activeProfile: RawParamProfileModel): ParamClassification {
    const activeProfileMap = this.descriptorsByProfile.get(activeProfile);
    const activeDescriptor = activeProfileMap?.get(paramId);

    if (activeDescriptor) {
      return {
        knownStatus: activeDescriptor.knownStatus ?? "known",
        decodedEntity: activeDescriptor.decodedEntity,
        decodedProperty: activeDescriptor.decodedProperty,
      };
    }

    for (const [profile, descriptors] of this.descriptorsByProfile.entries()) {
      if (profile === activeProfile) continue;
      const descriptor = descriptors.get(paramId);
      if (!descriptor) continue;

      return {
        knownStatus: "partiallyKnown",
        decodedEntity: descriptor.decodedEntity,
        decodedProperty: descriptor.decodedProperty,
      };
    }

    return {
      knownStatus: "unknown",
    };
  }

  getKnownParamIds(profile: RawParamProfileModel) {
    return new Set(this.descriptorsByProfile.get(profile)?.keys() ?? []);
  }

  getRegisteredProfiles() {
    return Array.from(this.descriptorsByProfile.keys());
  }
}
