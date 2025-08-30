import pandas as pd

# Load the data from the CSV file
df = pd.read_csv('df_combined.csv')

# Define the Bayesian priors for each engagement type
# These are your alpha and beta values
priors = {
    'likes': {'alpha': 5, 'beta': 95},
    'saves': {'alpha': 2.5, 'beta': 97.5},
    'comments': {'alpha': 1, 'beta': 99},
    'shares': {'alpha': 1, 'beta': 99}
}

# Apply Bayesian smoothing to each engagement type separately
# The smoothed count is calculated as (raw_count + alpha)
df['smoothed_likes'] = df['diggCount'] + priors['likes']['alpha']
df['smoothed_saves'] = df['collectCount'] + priors['saves']['alpha']
df['smoothed_comments'] = df['commentCount'] + priors['comments']['alpha']
df['smoothed_shares'] = df['shareCount'] + priors['shares']['alpha']

# Calculate the total smoothed engagements and total smoothed views
# Total smoothed engagements = smoothed_likes + smoothed_saves + smoothed_comments + smoothed_shares
df['total_smoothed_engagements'] = (
    df['smoothed_likes'] +
    df['smoothed_saves'] +
    df['smoothed_comments'] +
    df['smoothed_shares']
)

# Total smoothed views = raw_views + alpha_total + beta_total
total_alpha = (
    priors['likes']['alpha'] +
    priors['saves']['alpha'] +
    priors['comments']['alpha'] +
    priors['shares']['alpha']
)
total_beta = (
    priors['likes']['beta'] +
    priors['saves']['beta'] +
    priors['comments']['beta'] +
    priors['shares']['beta']
)
total_prior_views = total_alpha + total_beta

df['total_smoothed_views'] = df['playCount'] + total_prior_views

# Calculate the final smoothed engagement rate
# The formula is (Total Smoothed Engagements) / (Total Smoothed Views)
df['smoothed_engagement_rate'] = (
    df['total_smoothed_engagements'] /
    df['total_smoothed_views']
) * 100

# Display the video ID and the new smoothed engagement rate
print(df[['id', 'smoothed_engagement_rate']])