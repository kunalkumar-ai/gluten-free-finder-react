import feedparser
import datetime
from typing import List, Dict

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_gluten_free_news() -> List[Dict]:
    """Fetches the latest gluten-free related news using RSS feeds."""
    # Using the RSS feed from Gluten Free Living
    feed_url = 'https://www.glutenfreeliving.com/feed/'
    
    articles = []
    
    try:
        logger.info("Fetching news feed")
        feed = feedparser.parse(feed_url)
        
        if feed.bozo:
            logger.warning(f"Feed parsing error: {feed.bozo_exception}")
            return []
        
        logger.info(f"Found {len(feed.entries)} articles in feed")
        
        for entry in feed.entries[:10]:  # Get top 10 articles
            try:
                article = {
                    'title': entry.title,
                    'url': entry.link,
                    'date': entry.published if hasattr(entry, 'published') else datetime.datetime.now().strftime("%B %d, %Y"),
                    'source': 'Gluten Free Living'
                }
                articles.append(article)
                logger.info(f"Added article: {article['title']}")
            except Exception as e:
                logger.error(f"Error processing feed entry: {str(e)}")
                logger.error(f"Feed entry: {str(entry)[:500]}")
    except Exception as e:
        logger.error(f"Error fetching feed: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
    
    logger.info(f"Total articles found: {len(articles)}")
    return articles
    
    try:
        logger.info(f"Fetching news from {source['name']}")
        response = requests.get(source['url'])
        logger.info(f"Response status code: {response.status_code}")
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            logger.info(f"Page content length: {len(response.text)}")
            
            items = soup.select(source['selector'])
            logger.info(f"Found {len(items)} items using selector '{source['selector']}'")
            
            if len(items) == 0:
                logger.warning(f"No items found with selector '{source['selector']}'")
                logger.warning(f"HTML content preview: {response.text[:500]}")
            
            for item in items[:10]:  # Get top 10 articles
                try:
                    logger.info(f"Processing item: {str(item)[:100]}")
                    
                    title = item.select_one(source.get('title_selector', 'h2'))
                    if title:
                        title = title.text.strip()
                        logger.info(f"Found title: {title}")
                    else:
                        logger.warning(f"No title found using selector '{source.get('title_selector', 'h2')}'")
                        
                    link = item.select_one(source.get('link_selector', 'a'))
                    if link:
                        link = link['href']
                        logger.info(f"Found link: {link}")
                    else:
                        logger.warning(f"No link found using selector '{source.get('link_selector', 'a')}'")
                        
                    if title and link:
                        date = datetime.datetime.now().strftime("%B %d, %Y")
                        
                        # If the link is relative, make it absolute
                        if not link.startswith('http'):
                            link = source['url'].split('/')[0] + '//' + source['url'].split('/')[2] + link
                            logger.info(f"Converted relative link to absolute: {link}")
                        
                        article = {
                            'title': title,
                            'url': link,
                            'date': date,
                            'source': source['name']
                        }
                        articles.append(article)
                        logger.info(f"Successfully added article: {title}")
                except Exception as e:
                    logger.error(f"Error processing article: {str(e)}")
                    logger.error(f"Article HTML: {str(item)[:500]}")
        else:
            logger.error(f"Failed to fetch from {source['name']}: Status code {response.status_code}")
            logger.error(f"Response content: {response.text[:500]}")
    except Exception as e:
        logger.error(f"Error fetching from {source['name']}: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
    
    logger.info(f"Total articles found: {len(articles)}")
    return articles
