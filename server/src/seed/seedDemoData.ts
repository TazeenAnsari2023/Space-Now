import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose, { Types } from "mongoose";
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary";
import Review from "../models/Review";
import Space from "../models/Space";
import User from "../models/User";
import { detectFakeReview } from "../services/fakeReview.service";

const OWNER_COUNT = 15;
const USER_COUNT = 20;
const MAX_SPACES_PER_OWNER = 4;
const TOTAL_SPACES = 50; // requested total
const PASSWORD = "Pass@123";

type CityConfig = {
  name: string;
  state: string;
  lat: number;
  lng: number;
  priceBase: number;
};

const cityConfigs: CityConfig[] = [
  { name: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777, priceBase: 12800 },
  { name: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946, priceBase: 12100 },
  { name: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867, priceBase: 10700 },
  { name: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, priceBase: 9800 },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, priceBase: 9900 },
  { name: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.209, priceBase: 11900 },
  { name: "Noida", state: "Uttar Pradesh", lat: 28.5355, lng: 77.391, priceBase: 9400 },
  { name: "Gurugram", state: "Haryana", lat: 28.4595, lng: 77.0266, priceBase: 11500 },
  { name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, priceBase: 8600 },
  { name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, priceBase: 7900 },
  { name: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577, priceBase: 7400 },
  { name: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882, priceBase: 7000 }
];

const photoSourceUrls = [
  "https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg",
  "https://images.pexels.com/photos/260931/pexels-photo-260931.jpeg",
  "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg",
  "https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg",
  "https://images.pexels.com/photos/37347/office-sitting-room-executive-sitting.jpg",
  "https://images.pexels.com/photos/2977565/pexels-photo-2977565.jpeg",
  "https://images.pexels.com/photos/2451568/pexels-photo-2451568.jpeg",
  "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg",
  "https://images.pexels.com/photos/2451622/pexels-photo-2451622.jpeg",
  "https://images.pexels.com/photos/416405/pexels-photo-416405.jpeg",
  "https://images.pexels.com/photos/3201763/pexels-photo-3201763.jpeg",
  "https://images.pexels.com/photos/380768/pexels-photo-380768.jpeg"
];

const genuineReviewBank = [
  "The WiFi speed is stable and suitable for video meetings.",
  "Comfortable seating and good lighting for long work hours.",
  "The workspace is clean and professionally maintained.",
  "Affordable pricing compared to nearby coworking spaces.",
  "Staff members are helpful and responsive to issues.",
  "Location is close to public transport.",
  "Good place for freelancers and startups.",
  "The environment is quiet and suitable for focused work."
];

const promotionalReviewBank = [
  "BEST COWORKING SPACE EVER MUST JOIN NOW!!!",
  "Amazing amazing amazing workspace best best!!!",
  "Perfect office 100% recommended must visit!!!",
  "Top rated best coworking space!!!"
];

const adjectives = ["Prime", "Urban", "Launch", "Vertex", "Nexus", "Orbit"];
const nouns = ["Cowork Hub", "Workspace", "Office Loft", "Studio", "Business Center"];

const amenityPool = [
  "WiFi",
  "Air Conditioning",
  "Printing",
  "Meeting Rooms",
  "Personal Lockers",
  "Free Coffee",
  "Free Tea",
  "Parking",
  "Power Backup",
  "Community Events",
  "Reception",
  "24x7 Access"
];

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number) =>
  Number((Math.random() * (max - min) + min).toFixed(1));

const pickMany = <T>(arr: T[], count: number): T[] => {
  const copy = [...arr];
  const picked: T[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = randomInt(0, copy.length - 1);
    picked.push(copy[idx]);
    copy.splice(idx, 1);
    if (!copy.length) {
      break;
    }
  }
  return picked;
};

const createOwnerDocs = () =>
  Array.from({ length: OWNER_COUNT }, (_, idx) => ({
    name: `Owner ${String(idx + 1).padStart(2, "0")}`,
    email: `owner${idx + 1}@spacenow.seed`,
    username: `owner_seed_${idx + 1}`,
    mobile: `90000${String(10000 + idx)}`,
    city: cityConfigs[idx % cityConfigs.length].name,
    state: cityConfigs[idx % cityConfigs.length].state,
    role: "owner" as const,
    emailVerified: true,
    ownerVerificationStatus: "verified" as const,
    officeAddress: `Suite ${idx + 1}, ${cityConfigs[idx % cityConfigs.length].name} Business Park`,
    officeNumber: `0${randomInt(20, 89)}${String(300000 + idx)}`
  }));

const createUserDocs = () =>
  Array.from({ length: USER_COUNT }, (_, idx) => ({
    name: `User ${String(idx + 1).padStart(2, "0")}`,
    email: `user${idx + 1}@spacenow.seed`,
    username: `user_seed_${idx + 1}`,
    mobile: `80000${String(10000 + idx)}`,
    city: cityConfigs[(idx + 2) % cityConfigs.length].name,
    state: cityConfigs[(idx + 2) % cityConfigs.length].state,
    role: "user" as const,
    emailVerified: true
  }));

const createAdminDoc = () => ({
  name: "Admin 01",
  email: "admin@spacenow.seed",
  username: "admin_seed_1",
  mobile: "9999900001",
  city: "Bengaluru",
  state: "Karnataka",
  role: "admin" as const,
  emailVerified: true
});

const uploadSeedPhotosToCloudinary = async () => {
  if (!isCloudinaryConfigured) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
    );
  }

  const uploaded: string[] = [];
  for (let i = 0; i < photoSourceUrls.length; i += 1) {
    const sourceUrl = photoSourceUrls[i];
    const result = await cloudinary.uploader.upload(sourceUrl, {
      folder: "space-now/seed-coworking",
      public_id: `coworking_seed_${i + 1}`,
      overwrite: true
    });
    uploaded.push(result.secure_url);
  }

  if (!uploaded.length) {
    throw new Error("Cloudinary photo upload failed for seed dataset.");
  }

  return uploaded;
};

async function seedDemoData() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI missing in server/.env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB cluster");

    const uploadedPhotoUrls = await uploadSeedPhotosToCloudinary();
    console.log(`Uploaded/updated ${uploadedPhotoUrls.length} coworking photos in Cloudinary`);

    await Promise.all([
      Review.deleteMany({}),
      Space.deleteMany({}),
      User.deleteMany({
        $or: [
          { email: { $regex: "@spacenow\\.seed$", $options: "i" } },
          { username: { $regex: "^(owner_seed_|user_seed_|admin_seed_)", $options: "i" } }
        ]
      })
    ]);

    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    const ownerDocs = await User.insertMany(
      createOwnerDocs().map((owner) => ({ ...owner, password: hashedPassword }))
    );
    const userDocs = await User.insertMany(
      createUserDocs().map((user) => ({ ...user, password: hashedPassword }))
    );
    const adminDoc = await User.create({ ...createAdminDoc(), password: hashedPassword });

    const spacesPayload: Array<Record<string, unknown>> = [];
    const ownerRotation: Array<{ ownerId: Types.ObjectId; count: number }> = ownerDocs.map((owner) => ({
      ownerId: owner._id,
      count: 0
    }));

    for (let i = 0; i < TOTAL_SPACES; i += 1) {
      const city = cityConfigs[i % cityConfigs.length];
      const owner =
        ownerRotation.find((o) => o.count < MAX_SPACES_PER_OWNER) ||
        ownerRotation[i % ownerRotation.length];
      owner.count += 1;

      const name = `${adjectives[randomInt(0, adjectives.length - 1)]} ${city.name} ${nouns[randomInt(0, nouns.length - 1)]}`;
      const coworkingPrice = city.priceBase + randomInt(-1300, 1700);
      const latShift = Number(((Math.random() - 0.5) * 0.09).toFixed(6));
      const lngShift = Number(((Math.random() - 0.5) * 0.09).toFixed(6));
      const lat = Number((city.lat + latShift).toFixed(6));
      const lng = Number((city.lng + lngShift).toFixed(6));

      spacesPayload.push({
        name,
        pricePerMonth: coworkingPrice,
        availableSeats: randomInt(8, 65),
        location: { type: "Point", coordinates: [lng, lat] },
        amenities: {
          wifi: true,
          ac: Math.random() > 0.1,
          parking: Math.random() > 0.2
        },
        city: city.name,
        state: city.state,
        address: `${randomInt(10, 799)}, ${city.name} Business District, ${city.state}`,
        overview: `${name} offers flexible desks and private cabins for startups, freelancers, and remote teams in ${city.name}.`,
        amenityHighlights: pickMany(amenityPool, randomInt(8, 11)),
        photos: pickMany(uploadedPhotoUrls, 4),
        pricing: {
          servicedOffice: coworkingPrice + randomInt(11000, 22000),
          coworkingSpace: coworkingPrice,
          privateOffice: coworkingPrice + randomInt(5500, 13000),
          virtualOffice: randomInt(1800, 4200)
        },
        rating: randomFloat(4.0, 4.8),
        reviewCount: 0,
        ratingBreakdown: {
          location: randomFloat(4.0, 5.0),
          wifi: randomFloat(4.0, 5.0),
          productivity: randomFloat(3.9, 5.0),
          comfort: randomFloat(3.8, 5.0),
          community: randomFloat(3.8, 5.0),
          amenities: randomFloat(4.0, 5.0)
        },
        ownerId: owner.ownerId,
        verificationStatus: "verified",
        verificationSource: "nominatim",
        verificationScore: Number(randomFloat(0.86, 0.99).toFixed(2)),
        verifiedAt: new Date(),
        verificationNotes: "Seeded and verified"
      });
    }

    const insertedSpaces = await Space.insertMany(spacesPayload);

    const reviewPayload: Array<Record<string, unknown>> = [];
    insertedSpaces.forEach((space) => {
      const reviewCount = randomInt(2, 5);
      for (let i = 0; i < reviewCount; i += 1) {
        const user = userDocs[randomInt(0, userDocs.length - 1)];
        const usePromotional = Math.random() < 0.15;
        const comment = usePromotional
          ? promotionalReviewBank[randomInt(0, promotionalReviewBank.length - 1)]
          : genuineReviewBank[randomInt(0, genuineReviewBank.length - 1)];

        const prediction = detectFakeReview(comment);
        reviewPayload.push({
          userId: user._id,
          spaceId: space._id,
          rating: usePromotional ? randomInt(4, 5) : randomInt(3, 5),
          comment,
          isFake: prediction.isFake,
          confidenceScore: prediction.confidenceScore
        });
      }
    });

    await Review.insertMany(reviewPayload);

    // Update review stats using only genuine reviews.
    for (const space of insertedSpaces) {
      const stats = await Review.aggregate([
        { $match: { spaceId: space._id, isFake: false } },
        { $group: { _id: null, avgRating: { $avg: "$rating" }, total: { $sum: 1 } } }
      ]);
      await Space.findByIdAndUpdate(space._id, {
        rating: stats[0]?.avgRating ? Number(stats[0].avgRating.toFixed(2)) : 0,
        reviewCount: stats[0]?.total || 0
      });
    }

    const citySummary = cityConfigs.map((city) => ({
      city: city.name,
      spaces: insertedSpaces.filter((space) => space.city === city.name).length
    }));
    console.table(citySummary);

    console.log("Seed completed successfully.");
    console.log(`Owners: ${ownerDocs.length}`);
    console.log(`Users: ${userDocs.length}`);
    console.log(`Spaces: ${insertedSpaces.length}`);
    console.log(`Reviews: ${reviewPayload.length}`);
    console.log(`Default login password (seed users): ${PASSWORD}`);
    console.log("Example owner login: owner1@spacenow.seed");
    console.log("Example user login: user1@spacenow.seed");
    console.log("Example admin login: admin@spacenow.seed");
    console.log(`Admin role seeded as: ${adminDoc.role}`);

    process.exit(0);
  } catch (error) {
    console.error("Seed failed", error);
    process.exit(1);
  }
}

seedDemoData();
