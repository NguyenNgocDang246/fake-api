import type { Faker } from "@faker-js/faker";
import { JsonLeaf, SemanticName, SupportedLocale } from "@/models/endpoint_plan/catalog.model";
import { LANGUAGE_NAMES, LOCALE_COUNTRY } from "@/server/services/endpoint/variant/faker_locale";

// A switch with no `default` returning a non-optional `JsonLeaf`, so a name added to
// `SEMANTIC_TYPES` fails to build until it is handled here.
export function drawSemantic(name: SemanticName, f: Faker, locale: SupportedLocale): JsonLeaf {
  switch (name) {
    case "uuid":
      return f.string.uuid();
    case "short_id":
      return f.string.nanoid();
    case "email":
      return f.internet.email();
    case "username":
      return f.internet.username();
    case "password":
      return f.internet.password();
    case "phone":
      return f.phone.number();
    case "url":
      return f.internet.url();
    case "domain":
      return f.internet.domainName();
    case "image_url":
      return f.image.url();
    case "avatar_url":
      return f.image.avatar();
    case "slug":
      return f.helpers.slugify(f.lorem.words(3)).toLowerCase();
    case "hex_color":
      return f.color.rgb();
    case "color_name":
      return f.color.human();
    case "ipv4":
      return f.internet.ipv4();
    case "ipv6":
      return f.internet.ipv6();
    case "mac_address":
      return f.internet.mac();
    case "user_agent":
      return f.internet.userAgent();
    case "mime_type":
      return f.system.mimeType();
    case "file_name":
      return f.system.fileName();
    case "file_extension":
      return f.system.fileExt();
    case "first_name":
      return f.person.firstName();
    case "last_name":
      return f.person.lastName();
    case "full_name":
      return f.person.fullName();
    case "job_title":
      return f.person.jobTitle();
    case "department":
      return f.commerce.department();
    case "company_name":
      return f.company.name();
    case "product_name":
      return f.commerce.productName();
    case "product_category":
      return f.commerce.department();
    case "product_description":
      return f.commerce.productDescription();
    case "currency_code":
      return f.finance.currencyCode();
    case "currency_name":
      return f.finance.currencyName();
    case "currency_symbol":
      return f.finance.currencySymbol();
    case "country":
      return LOCALE_COUNTRY[locale].name;
    case "country_code":
      return LOCALE_COUNTRY[locale].code;
    case "city":
      return f.location.city();
    case "street_address":
      return f.location.streetAddress();
    case "zip_code":
      return f.location.zipCode();
    case "timezone":
      return f.location.timeZone();
    case "locale_code":
      return locale;
    case "language":
      return f.helpers.arrayElement(LANGUAGE_NAMES);
    case "lorem_word":
      return f.lorem.word();
    case "lorem_words":
      return f.lorem.words({ min: 2, max: 6 });
    case "lorem_sentence":
      return f.lorem.sentence();
    case "lorem_paragraph":
      return f.lorem.paragraph();
    case "emoji":
      return f.internet.emoji();
    case "latitude":
      return f.location.latitude();
    case "longitude":
      return f.location.longitude();
  }
}
