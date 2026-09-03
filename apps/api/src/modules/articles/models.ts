import { Schema, type Connection, type Model, Types } from 'mongoose';
import { SUPPORTED_LOCALES, type LocalizedText } from '@sadat-real-estate/contracts';

export interface ArticleCategoryRecord {
  _id: Types.ObjectId;
  slug: string;
  name: LocalizedText;
  description?: LocalizedText;
  displayOrder: number;
  active: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface ArticleRecord {
  _id: Types.ObjectId;
  categoryId: Types.ObjectId;
  slug: string;
  title: LocalizedText;
  body: LocalizedText;
  seoTitle?: LocalizedText;
  seoDescription?: LocalizedText;
  coverAssetId?: Types.ObjectId;
  imageUrl?: string;
  authorId: Types.ObjectId;
  status: 'draft' | 'pending_review' | 'published' | 'archived';
  publishedAt?: Date;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface ArticleModels {
  ArticleCategory: Model<ArticleCategoryRecord>;
  Article: Model<ArticleRecord>;
}

const localizedSchema = new Schema<LocalizedText>({
  ar: { type: String, trim: true, minlength: 1, maxlength: 20_000 },
  en: { type: String, trim: true, minlength: 1, maxlength: 20_000 }
}, { _id: false, strict: 'throw' });

function hasLocalizedValue(value: LocalizedText | undefined): boolean {
  return value !== undefined && SUPPORTED_LOCALES.some((locale) => value[locale]?.trim());
}

const articleCategorySchema = new Schema<ArticleCategoryRecord>({
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  },
  name: { type: localizedSchema, required: true },
  description: { type: localizedSchema },
  displayOrder: { type: Number, min: 0, max: 10_000, default: 0 },
  active: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, required: true, immutable: true },
  updatedBy: { type: Schema.Types.ObjectId, required: true }
}, {
  collection: 'article_categories',
  strict: 'throw',
  timestamps: true,
  versionKey: 'version',
  optimisticConcurrency: true
});

articleCategorySchema.index({ slug: 1 }, {
  unique: true,
  name: 'article_category_slug_unique'
});
articleCategorySchema.index({ active: 1, displayOrder: 1, slug: 1, _id: 1 }, {
  name: 'article_category_public_order'
});
articleCategorySchema.index({
  'name.ar': 'text',
  'name.en': 'text',
  'description.ar': 'text',
  'description.en': 'text'
}, {
  name: 'article_category_localized_search',
  default_language: 'none'
});
articleCategorySchema.pre('validate', function validateLocalizedCategory() {
  if (!hasLocalizedValue(this.name)) this.invalidate('name', 'At least one localized category name is required');
  if (this.description !== undefined && !hasLocalizedValue(this.description)) {
    this.invalidate('description', 'Category description cannot be an empty localized object');
  }
});

const articleSchema = new Schema<ArticleRecord>({
  categoryId: { type: Schema.Types.ObjectId, ref: 'ArticleCategory', required: true },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  },
  title: { type: localizedSchema, required: true },
  body: { type: localizedSchema, required: true },
  seoTitle: { type: localizedSchema },
  seoDescription: { type: localizedSchema },
  coverAssetId: { type: Schema.Types.ObjectId },
  imageUrl: { type: String, trim: true, maxlength: 2_048 },
  authorId: { type: Schema.Types.ObjectId, required: true, immutable: true },
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'published', 'archived'],
    required: true,
    default: 'draft'
  },
  publishedAt: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, required: true, immutable: true },
  updatedBy: { type: Schema.Types.ObjectId, required: true }
}, {
  collection: 'articles',
  strict: 'throw',
  timestamps: true,
  versionKey: 'version',
  optimisticConcurrency: true
});

articleSchema.pre('validate', function validatePublishedArticle() {
  if (!hasLocalizedValue(this.title)) this.invalidate('title', 'At least one localized title is required');
  if (!hasLocalizedValue(this.body)) this.invalidate('body', 'At least one localized body is required');
  if (this.status === 'published' && !this.publishedAt) {
    this.invalidate('publishedAt', 'Published articles require a publication timestamp');
  }
});
articleSchema.index({ slug: 1 }, { unique: true, name: 'article_slug_unique' });
articleSchema.index({ status: 1, publishedAt: -1, _id: 1 }, {
  name: 'article_public_publication_order'
});
articleSchema.index({ categoryId: 1, status: 1, publishedAt: -1, _id: 1 }, {
  name: 'article_public_category_order'
});
articleSchema.index({ status: 1, updatedAt: -1, _id: 1 }, {
  name: 'article_admin_state_order'
});
articleSchema.index({
  'title.ar': 'text',
  'title.en': 'text',
  'body.ar': 'text',
  'body.en': 'text'
}, {
  name: 'article_localized_search',
  default_language: 'none'
});

export function createArticleModels(connection: Connection): ArticleModels {
  const ArticleCategory = (connection.models.ArticleCategory as Model<ArticleCategoryRecord> | undefined)
    ?? connection.model<ArticleCategoryRecord>('ArticleCategory', articleCategorySchema);
  const Article = (connection.models.Article as Model<ArticleRecord> | undefined)
    ?? connection.model<ArticleRecord>('Article', articleSchema);
  return { ArticleCategory, Article };
}
