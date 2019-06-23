// Original source: <https://github.com/kitian616/jekyll-TeXt-theme/blob/master/_includes/scripts/article.js>
(function () {
  var SOURCES = window.TEXT_VARIABLES.sources;
  window.Lazyload.js(SOURCES.jquery, function () {
    $(function () {
      var $this, $scroll;
      var $articleContent = $('.js-article-content');
      var hasSidebar = $('.js-page-root').hasClass('layout--page--sidebar');
      var scroll = hasSidebar ? '.js-page-main' : 'html, body';
      $scroll = $(scroll);

      $articleContent.find('.highlight').each(function () {
        $this = $(this);
        $this.attr('data-lang', $this.find('code').attr('data-lang'));
      });
      $articleContent.find('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]').each(function () {
        $this = $(this);
        $this.prepend(
          $('<a class="anchor d-print-none" aria-hidden="true"></a>')
            .attr('href', '#' + $this.attr('id'))
            .html('<i class="fas fa-hashtag"></i>')
        );
      });
      $articleContent.on('click', '.anchor', function (event) {
        event.preventDefault();
        $scroll.scrollToAnchor('#' + $(this).parent().attr('id'), 400);
      });
    });
  });
})();
