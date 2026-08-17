import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose, { type Model } from 'mongoose';
import { createArticleModels } from '../../src/modules/articles/models.js';

function indexByName(model: Model<unknown>, name: string) {
  return model.schema.indexes().find(([, options]) => options.name === name);
}

test('article category and article models are strict, reusable, and indexed for actual admin and public queries', async () => {
  const connection = mongoose.createConnection();
  const models = createArticleModels(connection);
  assert.equal(models.Article, createArticleModels(connection).Article);
  assert.equal(models.ArticleCategory, createArticleModels(connection).ArticleCategory);
  const actor = new mongoose.Types.ObjectId();
  const category = new models.ArticleCategory({
    slug: 'guides', name: { ar: 'أدلة', en: 'Guides' }, displayOrder: 1,
    active: true, createdBy: actor, updatedBy: actor
  });
  await category.validate();
  await assert.rejects(new models.ArticleCategory({
    slug: 'empty', name: {}, createdBy: actor, updatedBy: actor
  }).validate(), /localized category name/);
  assert.throws(() => new models.ArticleCategory({
    slug: 'unsafe', name: { en: 'Unsafe' }, createdBy: actor, updatedBy: actor,
    internalSecret: 'must-not-persist'
  }), /strict mode/);

  const article = new models.Article({
    categoryId: category._id,
    slug: 'buying-in-sadat',
    title: { en: 'Buying in Sadat' },
    body: { en: 'Editorial content' },
    authorId: actor,
    createdBy: actor,
    updatedBy: actor
  });
  await article.validate();
  article.status = 'published';
  await assert.rejects(article.validate(), /publication timestamp/);

  assert.equal(indexByName(models.ArticleCategory, 'article_category_slug_unique')?.[1].unique, true);
  assert.ok(indexByName(models.ArticleCategory, 'article_category_public_order'));
  assert.ok(indexByName(models.ArticleCategory, 'article_category_localized_search'));
  assert.equal(indexByName(models.Article, 'article_slug_unique')?.[1].unique, true);
  assert.ok(indexByName(models.Article, 'article_public_publication_order'));
  assert.ok(indexByName(models.Article, 'article_public_category_order'));
  assert.ok(indexByName(models.Article, 'article_admin_state_order'));
  assert.ok(indexByName(models.Article, 'article_localized_search'));
});
