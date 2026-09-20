import { Response } from "express";
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import Space from "../models/Space";
import User from "../models/User";
import { loadIndiaRegionsFromCsv } from "../services/indiaGeo.service";

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const cleaned = value
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0);

  return cleaned.length ? cleaned : undefined;
};

const normalizeOptionalString = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = String(value || "").trim();
  return normalized || undefined;
};

const areValidCoordinates = (latitude: number, longitude: number) => {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

const verifiedVisibilityFilter = {
  $or: [{ verificationStatus: "verified" }, { verificationStatus: { $exists: false } }]
};

const toRad = (value: number) => (value * Math.PI) / 180;

const distanceInKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const earthRadiusKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return earthRadiusKm * c;
};

const verifyPlaceCoordinates = async (
  address: string | undefined,
  city: string | undefined,
  state: string | undefined,
  submittedLatitude: number,
  submittedLongitude: number
) => {
  const exactLocation = await geocodeIndianAddress(address, city, state);

  if (!exactLocation) {
    return {
      status: "pending" as const,
      score: 0,
      source: "nominatim" as const,
      notes: "Could not verify exact address from third-party provider."
    };
  }

  const deltaKm = distanceInKm(
    submittedLatitude,
    submittedLongitude,
    exactLocation.latitude,
    exactLocation.longitude
  );

  if (deltaKm <= 2) {
    return {
      status: "verified" as const,
      score: Math.max(0, Number((1 - deltaKm / 2).toFixed(4))),
      source: "nominatim" as const,
      notes: `Verified via Nominatim. Coordinate delta ${deltaKm.toFixed(2)} km.`,
      finalLatitude: exactLocation.latitude,
      finalLongitude: exactLocation.longitude
    };
  }

  if (deltaKm <= 10) {
    return {
      status: "pending" as const,
      score: Math.max(0, Number((1 - deltaKm / 10).toFixed(4))),
      source: "nominatim" as const,
      notes: `Address found but coordinate delta ${deltaKm.toFixed(2)} km. Needs admin review.`,
      finalLatitude: exactLocation.latitude,
      finalLongitude: exactLocation.longitude
    };
  }

  return {
    status: "rejected" as const,
    score: 0,
    source: "nominatim" as const,
    notes: `Coordinate mismatch too high (${deltaKm.toFixed(2)} km).`,
    finalLatitude: exactLocation.latitude,
    finalLongitude: exactLocation.longitude
  };
};

const geocodeIndianAddress = async (address?: string, city?: string, state?: string) => {
  const query = [address, city, state, "India"].filter(Boolean).join(", ");
  if (!query) {
    return null;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Space-Now/1.0 owner-space-geocoder"
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const results = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const exactLocation = results[0];
    if (!exactLocation?.lat || !exactLocation?.lon) {
      return null;
    }

    const latitude = Number(exactLocation.lat);
    const longitude = Number(exactLocation.lon);

    if (!areValidCoordinates(latitude, longitude)) {
      return null;
    }

    return { latitude, longitude };
  } catch {
    return null;
  }
};

const uploadSingleFile = (file: Express.Multer.File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "space-now/spaces"
      },
      (error, result) => {
        if (error || !result) {
          reject(
            new Error(
              typeof error === "object" &&
                error !== null &&
                "message" in error &&
                typeof (error as { message?: unknown }).message === "string"
                ? (error as { message: string }).message
                : "Photo upload failed"
            )
          );
          return;
        }

        resolve(result.secure_url);
      }
    );

    stream.end(file.buffer);
  });
};

export const uploadSpacePhotos = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isCloudinaryConfigured) {
      return res.status(500).json({
        message:
          "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
      });
    }

    const files = (req.files as Express.Multer.File[]) || [];

    if (!files.length) {
      return res.status(400).json({ message: "Please upload at least one image" });
    }

    const urls = await Promise.all(files.map((file) => uploadSingleFile(file)));

    return res.json({ urls });
  } catch (error) {
    const message =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : error instanceof Error
          ? error.message
          : "Photo upload failed";
    return res.status(500).json({ message });
  }
};

export const geocodeSpaceAddress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const address = normalizeOptionalString(req.body.address);
    const city = normalizeOptionalString(req.body.city);
    const state = normalizeOptionalString(req.body.state);

    if (!address || !city || !state) {
      return res.status(400).json({ message: "Address, city and state are required" });
    }

    const exactLocation = await geocodeIndianAddress(address, city, state);
    if (!exactLocation) {
      return res.status(404).json({ message: "No exact map result found for this address" });
    }

    return res.json(exactLocation);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getNearbySpaces = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radiusKm ?? 0);
    const priceMin =
      req.query.priceMin !== undefined ? Number(req.query.priceMin) : undefined;
    const priceMax =
      req.query.priceMax !== undefined ? Number(req.query.priceMax) : undefined;
    const minRating =
      req.query.minRating !== undefined ? Number(req.query.minRating) : undefined;
    const minAvailableSeats =
      req.query.minAvailableSeats !== undefined ? Number(req.query.minAvailableSeats) : undefined;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));
    const swLat = req.query.swLat !== undefined ? Number(req.query.swLat) : undefined;
    const swLng = req.query.swLng !== undefined ? Number(req.query.swLng) : undefined;
    const neLat = req.query.neLat !== undefined ? Number(req.query.neLat) : undefined;
    const neLng = req.query.neLng !== undefined ? Number(req.query.neLng) : undefined;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: "lat and lng are required numbers" });
    }

    const hasBounds =
      swLat !== undefined &&
      swLng !== undefined &&
      neLat !== undefined &&
      neLng !== undefined &&
      !Number.isNaN(swLat) &&
      !Number.isNaN(swLng) &&
      !Number.isNaN(neLat) &&
      !Number.isNaN(neLng);

    const match: Record<string, unknown> = {
      ...verifiedVisibilityFilter
    };

    if (priceMin !== undefined && !Number.isNaN(priceMin)) {
      match.pricePerMonth = {
        ...(typeof match.pricePerMonth === "object" ? (match.pricePerMonth as object) : {}),
        $gte: priceMin
      };
    }

    if (priceMax !== undefined && !Number.isNaN(priceMax)) {
      match.pricePerMonth = {
        ...(typeof match.pricePerMonth === "object" ? (match.pricePerMonth as object) : {}),
        $lte: priceMax
      };
    }

    if (minRating !== undefined && !Number.isNaN(minRating)) {
      match.rating = { $gte: minRating };
    }

    if (minAvailableSeats !== undefined && !Number.isNaN(minAvailableSeats)) {
      match.availableSeats = { $gte: minAvailableSeats };
    }

    if (hasBounds) {
      match.location = {
        $geoWithin: {
          $box: [
            [swLng as number, swLat as number],
            [neLng as number, neLat as number]
          ]
        }
      };
    } else if (radiusKm > 0) {
      const maxDistance = radiusKm * 1000;
      match.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          $maxDistance: maxDistance
        }
      };
    }

    const total = await Space.countDocuments(match);
    const spaces = await Space.find(match)
      .sort(hasBounds ? { createdAt: -1 } : radiusKm > 0 ? { createdAt: -1 } : { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      items: spaces,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: page * limit < total
    });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getIndiaCityStats = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await Space.aggregate([
      {
        $match: {
          city: { $exists: true, $ne: null },
          ...verifiedVisibilityFilter
        }
      },
      {
        $group: {
          _id: {
            city: "$city",
            state: "$state"
          },
          avgPrice: { $avg: "$pricePerMonth" },
          spaces: { $sum: 1 },
          lat: { $avg: { $arrayElemAt: ["$location.coordinates", 1] } },
          lng: { $avg: { $arrayElemAt: ["$location.coordinates", 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          city: "$_id.city",
          state: "$_id.state",
          avgPrice: { $round: ["$avgPrice", 0] },
          spaces: 1,
          lat: { $round: ["$lat", 6] },
          lng: { $round: ["$lng", 6] }
        }
      },
      {
        $sort: {
          city: 1
        }
      }
    ]);

    return res.json(stats);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getIndiaRegionsGeo = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const regions = loadIndiaRegionsFromCsv();
    return res.json(regions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load India regions";
    return res.status(500).json({ message });
  }
};

export const getOwnerEnquiryNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const spaces = await Space.find({ ownerId: req.user.id }).sort({ updatedAt: -1 });

    const notifications = spaces.map((space, index) => {
      const seatSignal =
        space.availableSeats > 0 ? `${space.availableSeats} seats available` : "No seats available";
      const placeLabel = [space.city, space.state].filter(Boolean).join(", ") || "Unspecified location";

      return {
        id: `${space._id}-enquiry-${index}`,
        type: "enquiry",
        title: `New enquiry for ${space.name}`,
        message: `A potential client checked ${space.name} (${placeLabel}). Current desk starts at Rs ${space.pricePerMonth}/month with ${seatSignal}.`,
        spaceId: String(space._id),
        createdAt: space.updatedAt || space.createdAt
      };
    });

    return res.json(notifications);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getSpaceById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const space = await Space.findById(req.params.id);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    if (space.verificationStatus && space.verificationStatus !== "verified") {
      if (!req.user) {
        return res.status(404).json({ message: "Space not found" });
      }

      const isOwner = String(space.ownerId || "") === req.user.id;
      const isAdmin = req.user.role === "admin";
      if (!isOwner && !isAdmin) {
        return res.status(404).json({ message: "Space not found" });
      }
    }

    return res.json(space);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const createSpace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      pricePerMonth,
      availableSeats,
      latitude,
      longitude,
      city,
      state,
      address,
      overview,
      amenityHighlights,
      photos,
      pricing,
      amenities
    } = req.body;

    if (
      !name ||
      pricePerMonth === undefined ||
      availableSeats === undefined ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const owner = await User.findById(req.user.id).select("role ownerVerificationStatus");
    if (!owner || owner.role !== "owner") {
      return res.status(403).json({ message: "Only owners can create spaces" });
    }
    if (owner.ownerVerificationStatus === "rejected") {
      return res.status(403).json({ message: "Owner account is rejected by admin" });
    }
    if (owner.ownerVerificationStatus === "pending") {
      return res.status(403).json({
        message: "Owner verification pending. Admin approval is required before adding spaces."
      });
    }

    const normalizedCity = normalizeOptionalString(city);
    const normalizedState = normalizeOptionalString(state);
    const normalizedAddress = normalizeOptionalString(address);
    const fallbackLatitude = Number(latitude);
    const fallbackLongitude = Number(longitude);
    const verification = await verifyPlaceCoordinates(
      normalizedAddress,
      normalizedCity,
      normalizedState,
      fallbackLatitude,
      fallbackLongitude
    );

    const finalLatitude = verification.finalLatitude ?? fallbackLatitude;
    const finalLongitude = verification.finalLongitude ?? fallbackLongitude;

    if (!areValidCoordinates(finalLatitude, finalLongitude)) {
      return res.status(400).json({
        message: "A valid address location or valid latitude and longitude are required"
      });
    }

    const space = await Space.create({
      name,
      pricePerMonth: Number(pricePerMonth),
      availableSeats: Number(availableSeats),
      location: {
        type: "Point",
        coordinates: [finalLongitude, finalLatitude]
      },
      city: normalizedCity,
      state: normalizedState,
      address: normalizedAddress,
      overview: normalizeOptionalString(overview),
      amenityHighlights: normalizeStringArray(amenityHighlights),
      photos: normalizeStringArray(photos),
      pricing: pricing
        ? {
            servicedOffice:
              pricing.servicedOffice !== undefined ? Number(pricing.servicedOffice) : undefined,
            coworkingSpace:
              pricing.coworkingSpace !== undefined ? Number(pricing.coworkingSpace) : undefined,
            privateOffice:
              pricing.privateOffice !== undefined ? Number(pricing.privateOffice) : undefined,
            virtualOffice:
              pricing.virtualOffice !== undefined ? Number(pricing.virtualOffice) : undefined
          }
        : undefined,
      amenities: {
        wifi: Boolean(amenities?.wifi),
        ac: Boolean(amenities?.ac),
        parking: Boolean(amenities?.parking)
      },
      ownerId: req.user.id,
      verificationStatus: verification.status,
      verificationSource: verification.source,
      verificationScore: verification.score,
      verifiedAt: verification.status === "verified" ? new Date() : undefined,
      verificationNotes: verification.notes
    });

    return res.status(201).json({
      ...space.toObject(),
      moderationMessage:
        verification.status === "verified"
          ? "Space verified and published."
          : verification.status === "pending"
            ? "Space saved but pending verification. It will be visible after admin approval."
            : "Space rejected due to location mismatch. Please correct address/coordinates and resubmit."
    });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getOwnerSpaces = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const spaces = await Space.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
    return res.json(spaces);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateOwnerSpace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const owner = await User.findById(req.user.id).select("role ownerVerificationStatus");
    if (!owner || owner.role !== "owner") {
      return res.status(403).json({ message: "Only owners can update spaces" });
    }
    if (owner.ownerVerificationStatus === "rejected") {
      return res.status(403).json({ message: "Owner account is rejected by admin" });
    }
    if (owner.ownerVerificationStatus === "pending") {
      return res.status(403).json({
        message: "Owner verification pending. Admin approval is required before updating spaces."
      });
    }

    const {
      name,
      pricePerMonth,
      availableSeats,
      city,
      state,
      address,
      overview,
      amenityHighlights,
      photos,
      pricing,
      amenities
    } = req.body;

    const existingSpace = await Space.findOne({
      _id: req.params.id,
      ownerId: req.user.id
    });

    if (!existingSpace) {
      return res.status(404).json({ message: "Space not found or not owned by you" });
    }

    const nextCity = city !== undefined ? normalizeOptionalString(city) : existingSpace.city;
    const nextState = state !== undefined ? normalizeOptionalString(state) : existingSpace.state;
    const nextAddress = address !== undefined ? normalizeOptionalString(address) : existingSpace.address;
    const nextLatitude =
      req.body.latitude !== undefined
        ? Number(req.body.latitude)
        : existingSpace.location.coordinates[1];
    const nextLongitude =
      req.body.longitude !== undefined
        ? Number(req.body.longitude)
        : existingSpace.location.coordinates[0];

    if (!areValidCoordinates(nextLatitude, nextLongitude)) {
      return res.status(400).json({ message: "Invalid latitude or longitude" });
    }

    const verification = await verifyPlaceCoordinates(
      nextAddress,
      nextCity,
      nextState,
      nextLatitude,
      nextLongitude
    );

    const space = await Space.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerId: req.user.id
      },
      {
        ...(name !== undefined ? { name } : {}),
        ...(pricePerMonth !== undefined ? { pricePerMonth: Number(pricePerMonth) } : {}),
        ...(availableSeats !== undefined ? { availableSeats: Number(availableSeats) } : {}),
        ...(city !== undefined ? { city: nextCity } : {}),
        ...(state !== undefined ? { state: nextState } : {}),
        ...(address !== undefined ? { address: nextAddress } : {}),
        ...(overview !== undefined ? { overview: normalizeOptionalString(overview) } : {}),
        ...(amenityHighlights !== undefined
          ? { amenityHighlights: normalizeStringArray(amenityHighlights) }
          : {}),
        ...(photos !== undefined ? { photos: normalizeStringArray(photos) } : {}),
        ...(pricing !== undefined
          ? {
              pricing: {
                servicedOffice:
                  pricing.servicedOffice !== undefined
                    ? Number(pricing.servicedOffice)
                    : undefined,
                coworkingSpace:
                  pricing.coworkingSpace !== undefined
                    ? Number(pricing.coworkingSpace)
                    : undefined,
                privateOffice:
                  pricing.privateOffice !== undefined ? Number(pricing.privateOffice) : undefined,
                virtualOffice:
                  pricing.virtualOffice !== undefined ? Number(pricing.virtualOffice) : undefined
              }
            }
          : {}),
        ...(amenities !== undefined
          ? {
              amenities: {
                wifi: Boolean(amenities.wifi),
                ac: Boolean(amenities.ac),
                parking: Boolean(amenities.parking)
              }
            }
          : {}),
        location: {
          type: "Point",
          coordinates: [verification.finalLongitude ?? nextLongitude, verification.finalLatitude ?? nextLatitude]
        },
        verificationStatus: verification.status,
        verificationSource: verification.source,
        verificationScore: verification.score,
        verifiedAt: verification.status === "verified" ? new Date() : undefined,
        verificationNotes: verification.notes
      },
      { new: true }
    );

    if (!space) {
      return res.status(404).json({ message: "Space not found or not owned by you" });
    }

    return res.json(space);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteOwnerSpace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const deleted = await Space.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ message: "Space not found or not owned by you" });
    }

    return res.json({ message: "Space deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};
