<?php
/**
 * Spoonful sample content seeder.
 *
 * Run it from the LocalWP "Site shell" (it already has WP-CLI):
 *
 *   wp plugin install wordpress-seo contact-form-7 --activate
 *   wp eval-file /full/path/to/wordpress/seed/seed.php
 *
 * What it does (safe to run more than once, it updates instead of duplicating):
 *   1. Sets the site title, permalinks (/recipes/%postname%/) and 6 posts per page
 *   2. Deletes the default "Hello world!" post and "Sample Page"
 *   3. Creates 3 categories and 8 tags
 *   4. Creates 12 recipe posts, each with a featured image, alt text,
 *      a custom Yoast SEO title and meta description
 *   5. Creates the About, Contact and Privacy Policy pages
 *   6. Creates a Contact Form 7 form and puts it on the Contact page
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit( "Run this file with: wp eval-file seed.php\n" );
}

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

$dir     = __DIR__;
$content = json_decode( file_get_contents( $dir . '/content.json' ), true );

if ( ! $content ) {
	WP_CLI::error( 'Could not read content.json' );
}

if ( ! defined( 'WPSEO_VERSION' ) ) {
	WP_CLI::warning( 'Yoast SEO is not active. Run: wp plugin install wordpress-seo --activate' );
}
if ( ! class_exists( 'WPCF7_ContactForm' ) ) {
	WP_CLI::error( 'Contact Form 7 is not active. Run: wp plugin install contact-form-7 --activate' );
}

/* ------------------------------------------------------------------
 * 1. Site settings
 * ------------------------------------------------------------------ */
update_option( 'blogname', $content['site']['name'] );
update_option( 'blogdescription', $content['site']['tagline'] );
update_option( 'posts_per_page', 6 );

global $wp_rewrite;
$wp_rewrite->set_permalink_structure( '/recipes/%postname%/' );
flush_rewrite_rules( true );
WP_CLI::log( 'Permalinks set to /recipes/%postname%/' );

/* ------------------------------------------------------------------
 * 2. Remove default content
 * ------------------------------------------------------------------ */
foreach ( array( array( 'hello-world', 'post' ), array( 'sample-page', 'page' ) ) as $default ) {
	$found = get_page_by_path( $default[0], OBJECT, $default[1] );
	if ( $found ) {
		wp_delete_post( $found->ID, true );
	}
}

/* ------------------------------------------------------------------
 * 3. Categories and tags
 * ------------------------------------------------------------------ */
$category_ids = array();
foreach ( $content['categories'] as $cat ) {
	$term = term_exists( $cat['slug'], 'category' );
	if ( ! $term ) {
		$term = wp_insert_term( $cat['name'], 'category', array( 'slug' => $cat['slug'], 'description' => $cat['description'] ) );
	}
	$category_ids[ $cat['slug'] ] = (int) $term['term_id'];

	// Yoast stores term SEO data in one option, keyed by taxonomy and term ID.
	$tax_meta = get_option( 'wpseo_taxonomy_meta', array() );
	$tax_meta['category'][ $category_ids[ $cat['slug'] ] ] = array(
		'wpseo_title' => $cat['seoTitle'],
		'wpseo_desc'  => $cat['metaDesc'],
	);
	update_option( 'wpseo_taxonomy_meta', $tax_meta );
}

foreach ( $content['tags'] as $tag ) {
	if ( ! term_exists( $tag['slug'], 'post_tag' ) ) {
		wp_insert_term( $tag['name'], 'post_tag', array( 'slug' => $tag['slug'] ) );
	}
}
WP_CLI::log( 'Categories and tags ready' );

/* ------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------ */

/** Copy an image from seed/images into the Media Library and return the attachment ID. */
function spoonful_import_image( $file, $alt ) {
	$tmp = wp_tempnam( $file );
	copy( __DIR__ . '/images/' . $file, $tmp );

	$attachment_id = media_handle_sideload( array( 'name' => $file, 'tmp_name' => $tmp ), 0, $alt );
	if ( is_wp_error( $attachment_id ) ) {
		WP_CLI::warning( "Image $file failed: " . $attachment_id->get_error_message() );
		return 0;
	}
	update_post_meta( $attachment_id, '_wp_attachment_image_alt', $alt );
	return $attachment_id;
}

/** Turn a recipe from content.json into post HTML. */
function spoonful_recipe_html( $r ) {
	$html  = '<p>' . esc_html( $r['intro'] ) . '</p>';
	$html .= '<p><strong>Prep:</strong> ' . esc_html( $r['prep'] ) . ' &middot; <strong>Cook:</strong> ' . esc_html( $r['cook'] ) . ' &middot; <strong>Serves:</strong> ' . esc_html( $r['serves'] ) . '</p>';
	$html .= '<h2>Ingredients</h2><ul>';
	foreach ( $r['ingredients'] as $item ) {
		$html .= '<li>' . esc_html( $item ) . '</li>';
	}
	$html .= '</ul><h2>Method</h2><ol>';
	foreach ( $r['steps'] as $step ) {
		$html .= '<li>' . esc_html( $step ) . '</li>';
	}
	$html .= '</ol><h2>Tip</h2><p>' . esc_html( $r['tip'] ) . '</p>';
	return $html;
}

/** Create or update a post/page by slug and return its ID. */
function spoonful_upsert( $args ) {
	$existing = get_page_by_path( $args['post_name'], OBJECT, $args['post_type'] );
	if ( $existing ) {
		$args['ID'] = $existing->ID;
	}
	$id = wp_insert_post( $args, true );
	if ( is_wp_error( $id ) ) {
		WP_CLI::error( $id->get_error_message() );
	}
	return $id;
}

/* ------------------------------------------------------------------
 * 4. Recipe posts
 * ------------------------------------------------------------------ */
foreach ( $content['posts'] as $r ) {
	$existing     = get_page_by_path( $r['slug'], OBJECT, 'post' );
	$thumbnail_id = $existing ? get_post_thumbnail_id( $existing->ID ) : 0;
	if ( ! $thumbnail_id ) {
		$thumbnail_id = spoonful_import_image( $r['image'], $r['imageAlt'] );
	}

	// meta_input is saved before WordPress fires save_post, so Yoast builds its
	// SEO data (yoast_head_json) with our custom title, description and image.
	$id = spoonful_upsert( array(
		'post_type'     => 'post',
		'post_status'   => 'publish',
		'post_title'    => $r['title'],
		'post_name'     => $r['slug'],
		'post_excerpt'  => $r['excerpt'],
		'post_content'  => spoonful_recipe_html( $r ),
		'post_date'     => str_replace( 'T', ' ', $r['date'] ),
		'post_category' => array( $category_ids[ $r['category'] ] ),
		'tags_input'    => $r['tags'],
		'meta_input'    => array(
			'_thumbnail_id'         => $thumbnail_id,
			'_yoast_wpseo_title'    => $r['seoTitle'],
			'_yoast_wpseo_metadesc' => $r['metaDesc'],
			'_yoast_wpseo_focuskw'  => strtolower( $r['title'] ),
		),
	) );

	if ( $thumbnail_id ) {
		wp_update_post( array( 'ID' => $thumbnail_id, 'post_parent' => $id ) );
	}
	WP_CLI::log( "Post #$id  /recipes/{$r['slug']}/" );
}

/* ------------------------------------------------------------------
 * 5 + 6. Contact Form 7 form, then the pages
 * ------------------------------------------------------------------ */
$forms   = get_posts( array( 'post_type' => 'wpcf7_contact_form', 'title' => 'Spoonful contact form', 'numberposts' => 1 ) );
$form_id = $forms ? $forms[0]->ID : 0;
if ( ! $form_id ) {
	$form = WPCF7_ContactForm::get_template( array( 'title' => 'Spoonful contact form' ) );
	$form->save();
	$form_id = $form->id();
}
$shortcode = sprintf( '[contact-form-7 id="%d" title="Spoonful contact form"]', $form_id );
WP_CLI::log( "Contact Form 7 form #$form_id" );

foreach ( $content['pages'] as $p ) {
	$id = spoonful_upsert( array(
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => $p['title'],
		'post_name'    => $p['slug'],
		'post_content' => str_replace( '[contact-form]', $shortcode, $p['content'] ),
		'meta_input'   => array(
			'_yoast_wpseo_title'    => $p['seoTitle'],
			'_yoast_wpseo_metadesc' => $p['metaDesc'],
		),
	) );
	if ( 'privacy' === $p['slug'] ) {
		update_option( 'wp_page_for_privacy_policy', $id );
	}
	WP_CLI::log( "Page #$id  /{$p['slug']}/" );
}

WP_CLI::success( 'Spoonful content created. Open http://spoonful.local/wp-json/wp/v2/posts to check the REST API.' );
