/**
 * Dog and cat breed lists, for the breed field on a Winnie Ride request.
 *
 * PORTED VERBATIM from the ops app (`src/lib/pet-breeds.ts`, FIX_PROD_033),
 * which is the canonical source. Curated from public registries — AKC, FCI, UKC
 * — plus the common designer crosses, with the mixed-breed catchalls on top
 * because that is what most owners actually pick.
 *
 * Used as a <datalist>, never a closed <select>: an owner whose breed is not
 * listed types it and the form takes it. A booking must never fail because a
 * list is incomplete.
 *
 * When the ops list changes, re-copy it rather than editing here — two diverging
 * breed lists is how "Labradoodle" ends up meaning two different things.
 */

export const DOG_BREEDS: readonly string[] = [
  // Mixed-breed catchalls (most common — many pet parents pick these). Kept on top.
  "Mixed Breed (Small, up to 22 lb)",
  "Mixed Breed (Medium, 23–70 lb)",
  "Mixed Breed (Large, 71 lb+)",
  // Specific breeds, A→Z.
  "Affenpinscher", "Afghan Hound", "Airedale Terrier", "Akbash", "Akita",
  "Alaskan Klee Kai", "Alaskan Malamute", "American Bulldog", "American English Coonhound",
  "American Eskimo Dog", "American Foxhound", "American Hairless Terrier",
  "American Leopard Hound", "American Pit Bull Terrier", "American Staffordshire Terrier",
  "American Water Spaniel", "Anatolian Shepherd Dog", "Appenzeller Sennenhund",
  "Australian Cattle Dog", "Australian Kelpie", "Australian Shepherd", "Australian Terrier",
  "Azawakh", "Barbet", "Basenji", "Basset Fauve de Bretagne", "Basset Hound",
  "Bavarian Mountain Scent Hound", "Beagle", "Bearded Collie", "Beauceron",
  "Bedlington Terrier", "Belgian Laekenois", "Belgian Malinois", "Belgian Sheepdog",
  "Belgian Tervuren", "Bergamasco Sheepdog", "Berger Picard", "Bernedoodle",
  "Bernese Mountain Dog", "Bichon Frise", "Biewer Terrier", "Black and Tan Coonhound",
  "Black Russian Terrier", "Bloodhound", "Bluetick Coonhound", "Boerboel", "Bolognese",
  "Border Collie", "Border Terrier", "Borzoi", "Boston Terrier", "Bouvier des Flandres",
  "Boxer", "Boykin Spaniel", "Bracco Italiano", "Briard", "Brittany", "Brussels Griffon",
  "Bull Terrier", "Bulldog", "Bullmastiff", "Cairn Terrier", "Canaan Dog",
  "Cane Corso", "Cardigan Welsh Corgi", "Catahoula Leopard Dog", "Caucasian Shepherd Dog",
  "Cavalier King Charles Spaniel", "Cavapoo", "Cesky Terrier", "Chesapeake Bay Retriever",
  "Chihuahua", "Chinese Crested", "Chinese Shar-Pei", "Chinook", "Chow Chow",
  "Cirneco dell'Etna", "Clumber Spaniel", "Cockapoo", "Cocker Spaniel", "Collie",
  "Coton de Tulear", "Curly-Coated Retriever", "Dachshund", "Dalmatian",
  "Dandie Dinmont Terrier", "Doberman Pinscher", "Dogo Argentino", "Dogue de Bordeaux",
  "Dutch Shepherd", "English Cocker Spaniel", "English Foxhound", "English Setter",
  "English Springer Spaniel", "English Toy Spaniel", "Entlebucher Mountain Dog",
  "Estrela Mountain Dog", "Eurasier", "Field Spaniel", "Finnish Lapphund", "Finnish Spitz",
  "Flat-Coated Retriever", "Fox Terrier (Smooth)", "Fox Terrier (Wire)", "French Bulldog",
  "French Spaniel", "German Pinscher", "German Shepherd Dog", "German Shorthaired Pointer",
  "German Wirehaired Pointer", "Giant Schnauzer", "Glen of Imaal Terrier", "Goldador",
  "Golden Retriever", "Goldendoodle", "Gordon Setter", "Great Dane", "Great Pyrenees",
  "Greater Swiss Mountain Dog", "Greyhound", "Harrier", "Havanese", "Ibizan Hound",
  "Icelandic Sheepdog", "Irish Setter", "Irish Terrier", "Irish Water Spaniel",
  "Irish Wolfhound", "Italian Greyhound", "Jack Russell Terrier", "Japanese Chin",
  "Japanese Spitz", "Keeshond", "Kerry Blue Terrier", "Komondor", "Kuvasz", "Labradoodle",
  "Labrador Retriever", "Lagotto Romagnolo", "Lakeland Terrier", "Lancashire Heeler",
  "Leonberger", "Lhasa Apso", "Lowchen", "Maltese", "Maltipoo", "Manchester Terrier",
  "Mastiff", "Miniature American Shepherd", "Miniature Bull Terrier", "Miniature Pinscher",
  "Miniature Schnauzer", "Mudi", "Neapolitan Mastiff", "Newfoundland", "Norfolk Terrier",
  "Norwegian Buhund", "Norwegian Elkhound", "Norwegian Lundehund", "Norwich Terrier",
  "Nova Scotia Duck Tolling Retriever", "Old English Sheepdog", "Otterhound", "Papillon",
  "Pekingese", "Pembroke Welsh Corgi", "Petit Basset Griffon Vendeen", "Pharaoh Hound",
  "Plott Hound", "Pointer", "Polish Lowland Sheepdog", "Pomeranian", "Pomsky",
  "Poodle (Miniature)", "Poodle (Standard)", "Poodle (Toy)", "Portuguese Podengo",
  "Portuguese Water Dog", "Pug", "Puggle", "Puli", "Pumi", "Pyrenean Shepherd",
  "Rat Terrier", "Redbone Coonhound", "Rhodesian Ridgeback", "Rottweiler", "Russell Terrier",
  "Saint Bernard", "Saluki", "Samoyed", "Schipperke", "Scottish Deerhound",
  "Scottish Terrier", "Sealyham Terrier", "Shetland Sheepdog", "Shiba Inu", "Shih Tzu",
  "Shih-Poo", "Siberian Husky", "Silky Terrier", "Skye Terrier", "Sloughi",
  "Soft Coated Wheaten Terrier", "Spanish Water Dog", "Spinone Italiano",
  "Staffordshire Bull Terrier", "Standard Schnauzer", "Sussex Spaniel", "Swedish Vallhund",
  "Tibetan Mastiff", "Tibetan Spaniel", "Tibetan Terrier", "Toy Fox Terrier",
  "Treeing Walker Coonhound", "Vizsla", "Weimaraner", "Welsh Springer Spaniel",
  "Welsh Terrier", "West Highland White Terrier", "Whippet", "Wirehaired Pointing Griffon",
  "Wirehaired Vizsla", "Xoloitzcuintli", "Yorkipoo", "Yorkshire Terrier",
  "Other / Not Listed",
];

export const CAT_BREEDS: readonly string[] = [
  // Domestic catchalls first (most common).
  "Domestic Shorthair",
  "Domestic Medium Hair",
  "Domestic Longhair",
  // Specific breeds, A→Z.
  "Abyssinian", "American Bobtail", "American Curl", "American Shorthair", "American Wirehair",
  "Balinese", "Bengal", "Birman", "Bombay", "British Longhair", "British Shorthair",
  "Burmese", "Burmilla", "Chartreux", "Chausie", "Cornish Rex", "Cymric", "Devon Rex",
  "Egyptian Mau", "European Shorthair", "Exotic Shorthair", "Havana Brown", "Himalayan",
  "Japanese Bobtail", "Khao Manee", "Korat", "LaPerm", "Lykoi", "Maine Coon", "Manx",
  "Munchkin", "Nebelung", "Norwegian Forest Cat", "Ocicat", "Oriental Longhair",
  "Oriental Shorthair", "Persian", "Peterbald", "Pixie-bob", "Ragamuffin", "Ragdoll",
  "Russian Blue", "Savannah", "Scottish Fold", "Selkirk Rex", "Siamese", "Siberian",
  "Singapura", "Snowshoe", "Somali", "Sphynx", "Tonkinese", "Toyger", "Turkish Angora",
  "Turkish Van",
  "Other / Not Listed",
];

export type DogBreed = (typeof DOG_BREEDS)[number];
export type CatBreed = (typeof CAT_BREEDS)[number];

export const OTHER_BREED_SENTINEL = "Other / Not Listed";

// Backward-compatible species-keyed map. dog/cat derive from the canonical lists
// above; the smaller species lists are unchanged.
export const BREEDS_BY_SPECIES: Record<string, string[]> = {
  dog: [...DOG_BREEDS],
  cat: [...CAT_BREEDS],
  rabbit: [
    "Holland Lop", "Mini Rex", "Lionhead", "Netherland Dwarf",
    "Flemish Giant", "Mixed Breed", OTHER_BREED_SENTINEL,
  ],
  bird: [
    "Parakeet", "Cockatiel", "Canary", "Lovebird", "Finch",
    "Conure", "Parrot", OTHER_BREED_SENTINEL,
  ],
  reptile: [
    "Bearded Dragon", "Leopard Gecko", "Ball Python",
    "Corn Snake", "Iguana", "Turtle", "Tortoise", OTHER_BREED_SENTINEL,
  ],
  other: [],
};
