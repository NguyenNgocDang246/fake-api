import type { Faker } from "@faker-js/faker";
import {
  EntityDrawOf,
  EntityKind,
  JsonLeaf,
  SupportedLocale,
} from "@/models/endpoint_plan/catalog.model";
import { LOCALE_COUNTRY } from "@/server/services/endpoint/variant/faker_locale";

// Loose on purpose, and only at this boundary: `drawLeaf` looks an attribute up by a name that
// came out of the blueprint. That the name exists is enforced by each `draw*` returning
// `EntityDrawOf<K>`.
export type EntityDraw = Record<string, JsonLeaf>;

// One draw fills every attribute at once, and the derived ones are built from the ones already
// drawn. This is where "the email belongs to the name" becomes a fact about the code.
function drawPerson(f: Faker): EntityDrawOf<"person"> {
  const sex = f.person.sexType();
  const firstName = f.person.firstName(sex);
  const lastName = f.person.lastName(sex);
  const birth = f.date.birthdate();
  const ageMs = Date.now() - birth.getTime();

  return {
    first_name: firstName,
    last_name: lastName,
    full_name: f.person.fullName({ firstName, lastName, sex }),
    email: f.internet.email({ firstName, lastName }),
    username: f.internet.username({ firstName, lastName }),
    phone: f.phone.number(),
    avatar_url: f.image.avatar(),
    gender: sex,
    birth_date: birth.toISOString(),
    age: Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000)),
  };
}

function drawAddress(f: Faker, locale: SupportedLocale): EntityDrawOf<"address"> {
  const country = LOCALE_COUNTRY[locale];
  const street = f.location.streetAddress();
  const city = f.location.city();
  const state = f.location.state();
  const zip = f.location.zipCode();

  return {
    street,
    city,
    state,
    zip,
    country: country.name,
    country_code: country.code,
    full_address: `${street}, ${city}, ${state}, ${country.name}`,
    latitude: f.location.latitude(),
    longitude: f.location.longitude(),
  };
}

function drawCompany(f: Faker): EntityDrawOf<"company"> {
  const name = f.company.name();
  const domain = f.internet.domainName();

  return {
    name,
    slogan: f.company.catchPhrase(),
    domain,
    email: f.internet.email({ provider: domain }),
    url: `https://${domain}`,
    industry: f.commerce.department(),
  };
}

function drawProduct(f: Faker): EntityDrawOf<"product"> {
  return {
    name: f.commerce.productName(),
    description: f.commerce.productDescription(),
    sku: f.string.alphanumeric({ length: 8, casing: "upper" }),
    category: f.commerce.department(),
    material: f.commerce.productMaterial(),
    image_url: f.image.url(),
    price: Number(f.commerce.price()),
  };
}

export function drawEntity(kind: EntityKind, f: Faker, locale: SupportedLocale): EntityDraw {
  switch (kind) {
    case "person":
      return drawPerson(f);
    case "address":
      return drawAddress(f, locale);
    case "company":
      return drawCompany(f);
    case "product":
      return drawProduct(f);
  }
}
