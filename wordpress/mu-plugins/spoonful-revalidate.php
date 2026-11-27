<?php
/**
 * Plugin Name: Spoonful - Revalidate Next.js
 * Description: When a post, page or category changes, tell the Next.js site to refresh its cache.
 *
 * Install: copy this file into wp-content/mu-plugins/ (create the folder if needed),
 * then add these two lines to wp-config.php:
 *
 *   define( 'SPOONFUL_REVALIDATE_URL', 'https://your-site.vercel.app/api/revalidate' );
 *   define( 'SPOONFUL_REVALIDATE_SECRET', 'the same value as REVALIDATE_SECRET in Next.js' );
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function spoonful_ping_nextjs( $reason ) {
	if ( ! defined( 'SPOONFUL_REVALIDATE_URL' ) || ! defined( 'SPOONFUL_REVALIDATE_SECRET' ) ) {
		return;
	}
	wp_remote_post( SPOONFUL_REVALIDATE_URL, array(
		'blocking' => false, // don't make the editor wait for Next.js
		'timeout'  => 5,
		'headers'  => array(
			'Content-Type'        => 'application/json',
			'x-revalidate-secret' => SPOONFUL_REVALIDATE_SECRET,
		),
		'body'     => wp_json_encode( array( 'reason' => $reason ) ),
	) );
}

// Posts and pages: published, updated, trashed.
add_action( 'save_post', function ( $post_id, $post ) {
	if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
		return;
	}
	if ( in_array( $post->post_type, array( 'post', 'page' ), true ) ) {
		spoonful_ping_nextjs( "save_post:{$post->post_type}:{$post_id}" );
	}
}, 10, 2 );
add_action( 'trashed_post', function ( $post_id ) {
	spoonful_ping_nextjs( "trashed_post:{$post_id}" );
} );

// Categories and tags.
add_action( 'edited_term', function ( $term_id, $tt_id, $taxonomy ) {
	spoonful_ping_nextjs( "edited_term:{$taxonomy}:{$term_id}" );
}, 10, 3 );
